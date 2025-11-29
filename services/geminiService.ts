
import { GoogleGenAI, Type, Schema, GenerateContentResponse } from "@google/genai";
import { AnalysisResult, BOMResult, WebSource, PartSearchResult, CodeResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Models
const MANUAL_MODEL = "gemini-3-pro-preview"; // Best for deep reasoning with provided context (supports PDFs)
const SEARCH_MODEL = "gemini-2.5-flash"; // Supports Google Search tool

const RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    missingDatasheet: { 
      type: Type.BOOLEAN,
      description: "Set to true if you CANNOT find the datasheet, OR if the found part does not match the schematic symbol (pin count/labels mismatch). Otherwise false." 
    },
    sections: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          status: { type: Type.STRING, enum: ["pass", "fail", "warning", "info"] },
          content: { type: Type.STRING },
          boundingBox: {
            type: Type.ARRAY,
            items: { type: Type.NUMBER },
            description: "A single bounding box [ymin, xmin, ymax, xmax] normalized to 0-1000 representing the schematic region of interest."
          },
          datasheetImageUri: { type: Type.STRING },
          datasheetPageRef: { type: Type.NUMBER },
          correctData: { type: Type.STRING },
        },
        required: ["title", "status", "content"],
      },
    },
    suggestedFixes: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
  },
  required: ["summary", "sections", "suggestedFixes"],
};

export const analyzeSchematic = async (
  schematicBase64: string,
  schematicMime: string,
  partNumber: string,
  datasheetBase64: string | null,
  datasheetMime: string | null,
  additionalNotes: string
): Promise<AnalysisResult> => {
  
  const hasDatasheet = !!datasheetBase64;
  const isFullScan = !partNumber; // If no part number, we scan the whole schematic
  
  // Choose strategy
  // If we need to search multiple parts (Full Scan) or single part search, use SEARCH_MODEL.
  // If we have manual datasheet, use MANUAL_MODEL for deep reasoning.
  const modelName = hasDatasheet ? MANUAL_MODEL : SEARCH_MODEL;
  
  // Construct Prompt
  let prompt = "";
  
  if (isFullScan) {
    // FULL SCHEMATIC SCAN MODE
    prompt = `
      You are a Senior Electrical Engineer and Hardware Auditor.
      
      Inputs:
      1. A Schematic Diagram (PDF or Image).
      2. User Notes: "${additionalNotes}"
      
      Task:
      Perform a comprehensive audit of the provided schematic. 
      This is a multi-step process. Execute it page by page, in order.

      1. **Component Extraction**: Scan the schematic and identify the MAIN Integrated Circuits (ICs), Microcontrollers, Processors, and complex chips.
         - Ignore passive components (resistors, capacitors) unless they are critical decoupling or sensing elements attached to a main IC.
      
      2. **Online Verification (Auto-Search)**: 
         - For EACH identified main component, use Google Search to find its datasheet or pinout data (prioritize DigiKey, Mouser, Manufacturer PDFs).
         - Verify that the schematic symbol matches the real-world component (Pin count, Pin names).
         - FIND an image URL of the part's pinout or symbol if possible.
      
      3. **Circuit Audit**:
         - Verify Power Connections (VCC/GND/VDD/VSS). Are they connected?
         - Verify Decoupling. Are capacitors present near power pins?
         - Verify Control Pins (Reset, Enable, Boot0, etc.). Are they pulled up/down correctly?
         - Check for any floating inputs that should be tied.
         - If you find an error, identify the spatial location (Bounding Box) on the schematic.
      
      **CRITICAL OUTPUT INSTRUCTION:**
      Return the result as a valid JSON object strictly following this structure inside a markdown code block (\`\`\`json ... \`\`\`):
      {
        "summary": "A high-level summary of the entire schematic audit, listing the main parts found and the overall health of the design.",
        "missingDatasheet": false, 
        "sections": [
          // Create one section PER MAIN COMPONENT found.
          { 
            "title": "[Part Number] Verification", 
            "status": "pass" | "fail" | "warning" | "info", 
            "content": "Details about power, connections, and any errors found for this specific part.",
            "boundingBox": [ymin, xmin, ymax, xmax], // 0-1000 scale. Required if status is fail/warning.
            "datasheetImageUri": "https://...", // URL to an image of the pinout found online
            "correctData": "Markdown table of the correct pinout or specs"
          }
        ],
        "suggestedFixes": ["Global list of fix recommendations"]
      }
    `;
  } else if (hasDatasheet) {
    // MANUAL MODE (Specific Part + Datasheet)
    prompt = `
      You are a Senior Electrical Engineer and Hardware Design Auditor. 
      Your task is to verify an electronic schematic against a component datasheet.
      
      Inputs:
      1. Schematic Diagram (Image/PDF).
      2. The Datasheet (Document/Image).
      3. Target Part Number: ${partNumber}
      4. User notes: "${additionalNotes}"
  
      Task:
      Scan the provided datasheet document to find the pinout configuration, absolute maximum ratings, and recommended operating conditions for the part "${partNumber}".
      Then, analyze the schematic connections in the provided file.
      
      Verify the following:
      - Pinout Validation: Do the schematic pin numbers and labels match the datasheet?
      - Power Connections: Are VCC/GND connected correctly?
      - Decoupling: Are capacitors present as recommended by the datasheet?
      - Unused Pins: Are specific pins (like Reset, Enable, NC) handled correctly?
      - If you find an ERROR, you MUST provide the 'boundingBox' [ymin, xmin, ymax, xmax] for the schematic error and extract the 'correctData' from the datasheet.
  
      Output Format: JSON.
    `;
  } else {
    // AUTO SEARCH MODE (Specific Part Only)
    prompt = `
      You are a Senior Electrical Engineer. The user has provided a schematic but NOT the datasheet.
      
      Inputs:
      1. Schematic Diagram (Image/PDF).
      2. Target Part Number: "${partNumber}" (CRITICAL).
      3. User notes: "${additionalNotes}"
  
      Task:
      1. Use Google Search to find the pinout, datasheet, or symbol information for the part number "${partNumber}". 
         - Prioritize reliable distributors like **DigiKey**, **Mouser**, **Farnell**, or the manufacturer's official PDF.
         - Find an image URL of the component's official pinout or symbol.
      
      2. **VERIFICATION STEP (CRITICAL):**
         - Compare the pinout found online with the symbol shown in the schematic image.
         - Check: Does the pin count match? Do the visible pin labels match?
         - IF the part found online is significantly different from the schematic symbol (e.g., schematic shows 8 pins, datasheet has 14, or labels don't match), assume the search found the wrong variant or the schematic is using a custom symbol.
         - IN CASE OF MISMATCH or if you cannot find reliable data: Set "missingDatasheet" to true in the JSON response and stop.

      3. If the data matches:
         - Compare the schematic image against the pinout information you found.
         - Verify: Power pins (VCC/GND), Signal names, Floating pins, Decoupling.
         - If Error: Calculate boundingBox [ymin, xmin, ymax, xmax].
      
      **CRITICAL OUTPUT INSTRUCTION:**
      You must return the result as a valid JSON object strictly following this structure inside a markdown code block (\`\`\`json ... \`\`\`):
      {
        "summary": "string",
        "missingDatasheet": boolean, // Set to true if mismatch or not found
        "sections": [
          { 
             "title": "string", 
             "status": "pass" | "fail" | "warning" | "info", 
             "content": "string",
             "boundingBox": [ymin, xmin, ymax, xmax],
             "datasheetImageUri": "string", // URL of the pinout image found online
             "correctData": "string" // Markdown table
          }
        ],
        "suggestedFixes": ["string"]
      }
    `;
  }

  // Build content parts
  const parts: any[] = [{ text: prompt }];
  
  // Always add schematic
  parts.push({
    inlineData: {
      mimeType: schematicMime,
      data: schematicBase64,
    },
  });

  // Add datasheet if manual
  if (hasDatasheet && datasheetBase64 && datasheetMime) {
    parts.push({
      inlineData: {
        mimeType: datasheetMime,
        data: datasheetBase64,
      },
    });
  }

  try {
    let config: any = {};

    // Add tools only if we need to search (No datasheet provided)
    if (!hasDatasheet) {
      config.tools = [{ googleSearch: {} }];
      // NOTE: responseMimeType and responseSchema are NOT supported with googleSearch tools
    } else {
      config.responseMimeType = "application/json";
      config.responseSchema = RESPONSE_SCHEMA;
      config.thinkingConfig = { thinkingBudget: 4096 };
    }

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: modelName,
      contents: { parts },
      config: config
    });

    if (response.text) {
      let result: AnalysisResult;

      if (hasDatasheet) {
        // Native JSON response
        result = JSON.parse(response.text) as AnalysisResult;
      } else {
        // Extract JSON from Markdown block for Search Model (since we can't use responseSchema)
        const text = response.text;
        const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
        
        if (jsonMatch && jsonMatch[1]) {
           try {
             result = JSON.parse(jsonMatch[1]) as AnalysisResult;
           } catch (e) {
             // Fallback: try finding first { and last }
             const start = text.indexOf('{');
             const end = text.lastIndexOf('}');
             if (start !== -1 && end !== -1) {
                result = JSON.parse(text.substring(start, end + 1)) as AnalysisResult;
             } else {
                throw new Error("Failed to parse JSON from search result");
             }
           }
        } else {
           // Attempt to parse raw text if no code blocks found
           const start = text.indexOf('{');
           const end = text.lastIndexOf('}');
           if (start !== -1 && end !== -1) {
              result = JSON.parse(text.substring(start, end + 1)) as AnalysisResult;
           } else {
             console.error("Could not parse JSON from: ", text);
             throw new Error("AI response format was invalid. Please try again.");
           }
        }
      }
      
      // Extract grounding metadata if available (Search Sources)
      if (!hasDatasheet && response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
        result.sources = response.candidates[0].groundingMetadata.groundingChunks
          .map((chunk: any) => {
             if (chunk.web) {
               return { title: chunk.web.title, uri: chunk.web.uri };
             }
             return null;
          })
          .filter((source: any) => source !== null) as WebSource[];
      }
      
      // If the model says it's missing data, we trust it
      if (result.missingDatasheet) {
        return {
          summary: `Automatic lookup failed. The part "${partNumber || "identified in schematic"}" could not be confidently matched to the schematic symbol using online sources (DigiKey, Mouser, etc.). This might be due to a pin count mismatch or variant ambiguity.`,
          sections: [],
          suggestedFixes: [],
          missingDatasheet: true,
          sources: result.sources // Keep sources if any were found
        };
      }
      
      return result;
    } else {
      throw new Error("No response text generated");
    }
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};


export const generateBOM = async (
    schematicBase64: string,
    schematicMime: string,
): Promise<BOMResult> => {

    const prompt = `
      You are a Manufacturing Engineer and Procurement Specialist.
      
      Input: An electronic schematic image/PDF.
      
      Task:
      1. **Extract BOM**: Identify EVERY component in the schematic.
         - Group by unique Part Number / Value.
         - List the Designators (e.g., R1, R2, R3).
         - Count the total quantity for each.
      
      2. **Cost Estimation**:
         - Use Google Search to find the *average unit price* for each component (in USD).
         - Source prices from major distributors (DigiKey, Mouser, LCSC).
      
      3. **CAD & Footprints Discovery**:
         - Your goal is to find a URL where the user can download the 3D Model (STEP/IGES) or PCB Footprint.
         - **Prioritize "Landing Pages"**: It is often hard to find a direct .zip or .step link. Instead, find the **Search Result URL** or **Product Page URL** on major repositories.
         - Look for URLs on: **SnapEDA**, **UltraLibrarian**, **ComponentSearchEngine**, **Octopart**, **DigiKey (EDA/CAD Models section)**.
         - Example valid links: 
           - "https://www.snapeda.com/parts/STM32F103/STMicroelectronics/view-part/"
           - "https://www.ultralibrarian.com/search?query=STM32F103"
      
      Output Format:
      Return a VALID JSON object in a markdown code block (\`\`\`json ... \`\`\`).
      Structure:
      {
        "items": [
          {
            "partNumber": "string",
            "description": "string",
            "manufacturer": "string",
            "quantity": number,
            "designators": "string",
            "estimatedUnitPrice": number,
            "totalPrice": number,
            "cadLinks": {
               "model3d": "url string (The best link you found for 3D or the Product Page)",
               "footprint": "url string (Optional, if distinct from model3d)"
            }
          }
        ],
        "totalEstimatedCost": number,
        "currency": "USD"
      }
    `;

    const parts = [
        { text: prompt },
        { inlineData: { mimeType: schematicMime, data: schematicBase64 } }
    ];

    try {
        const response = await ai.models.generateContent({
            model: SEARCH_MODEL,
            contents: { parts },
            config: {
                tools: [{ googleSearch: {} }] // Essential for pricing and CAD links
            }
        });

        if (!response.text) throw new Error("No BOM generated");

        // Parse JSON from Markdown
        const text = response.text;
        let result: BOMResult;
        
        const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[1]) {
            result = JSON.parse(jsonMatch[1]) as BOMResult;
        } else {
             const start = text.indexOf('{');
             const end = text.lastIndexOf('}');
             if (start !== -1 && end !== -1) {
                result = JSON.parse(text.substring(start, end + 1)) as BOMResult;
             } else {
                throw new Error("Invalid BOM JSON format");
             }
        }

        // Add sources
        if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
            result.sources = response.candidates[0].groundingMetadata.groundingChunks
              .map((chunk: any) => chunk.web ? { title: chunk.web.title, uri: chunk.web.uri } : null)
              .filter(Boolean) as WebSource[];
        }

        return result;

    } catch (error) {
        console.error("BOM Generation Error:", error);
        throw error;
    }
};

export const searchPart = async (
  partNumber: string,
  includeDatasheet: boolean,
  includeCad: boolean,
  includePricing: boolean
): Promise<PartSearchResult> => {
  const prompt = `
    You are an Electronic Components Procurement Assistant.
    
    Task: Find detailed information for the component: "${partNumber}".
    
    The user is specifically asking for:
    ${includeDatasheet ? "- The Datasheet PDF URL." : ""}
    ${includeCad ? "- 3D CAD Models and Footprints (SnapEDA, UltraLibrarian, etc)." : ""}
    ${includePricing ? "- Pricing and Stock from major distributors (DigiKey, Mouser)." : ""}
    
    1. **Overview**: Find the Manufacturer and a short technical description.
    2. **Specs**: Extract key technical specs (e.g., Supply Voltage, Package, Current, Pin Count).
    3. **Image**: Find a URL for an image of the part.
    4. **Alternatives**: Suggest 2-3 compatible replacement part numbers.
    
    Output strictly valid JSON in a markdown code block (\`\`\`json\`).
    Structure:
    {
      "partNumber": "string",
      "manufacturer": "string",
      "description": "string",
      "imageUri": "url string",
      "specs": { "Key": "Value", "Vmax": "5.5V" },
      "datasheetUri": "url string",
      "cadLinks": {
         "model3d": "url string (Prioritize Landing Page)",
         "footprint": "url string",
         "provider": "e.g. SnapEDA"
      },
      "pricing": [
         { "distributor": "DigiKey", "price": "$1.20", "stock": "1000", "link": "url" }
      ],
      "alternatives": ["string", "string"]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: SEARCH_MODEL,
      contents: { parts: [{ text: prompt }] },
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    if (!response.text) throw new Error("No search result");

    const text = response.text;
    let result: PartSearchResult;
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    
    if (jsonMatch && jsonMatch[1]) {
      result = JSON.parse(jsonMatch[1]) as PartSearchResult;
    } else {
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start !== -1 && end !== -1) {
         result = JSON.parse(text.substring(start, end + 1)) as PartSearchResult;
      } else {
         throw new Error("Invalid Search JSON format");
      }
    }
    return result;
  } catch (error) {
    console.error("Part Search Error:", error);
    throw error;
  }
};

export const generateFirmware = async (
  schematicBase64: string,
  schematicMime: string,
  additionalNotes: string,
  pinMapping: string
): Promise<CodeResult> => {
  const prompt = `
    You are an Embedded Systems Engineer.
    
    Input: An electronic schematic image/PDF.
    User Notes: "${additionalNotes}"
    User Defined Pin Mapping: "${pinMapping}"
    
    Task:
    1. **Analyze Schematic & Mapping**: 
       - FIRST, check the "User Defined Pin Mapping" provided above. Treat these connections as the absolute truth.
       - SECOND, for any connections not specified by the user, analyze the schematic image to find how the Microcontroller is connected to peripherals (LEDs, Sensors, Buttons).
    
    2. **Generate Firmware**: 
       - Write a complete, ready-to-compile driver or main file to initialize these peripherals.
       - Use the most common framework for the identified MCU (e.g., HAL for STM32, Arduino for AVR/ESP32).
       - If no MCU is clear, assume Arduino C++ format.
       - **IMPORTANT**: Include comments explicitly stating which connections came from User Input vs Schematic Analysis.
    
    Output strictly valid JSON in a markdown code block (\`\`\`json\`).
    Structure:
    {
      "filename": "main.c", // or main.cpp, main.py
      "language": "c", // or cpp, python
      "architecture": "STM32 HAL", // or Arduino, ESP-IDF
      "description": "Short explanation of what the code does.",
      "code": "Full source code string (escaped correctly)"
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: MANUAL_MODEL,
      contents: { 
        parts: [
          { text: prompt },
          { inlineData: { mimeType: schematicMime, data: schematicBase64 } }
        ]
      },
      config: {
        responseMimeType: "application/json",
        // No Google Search needed here, mainly reasoning on the image
      }
    });

    if (!response.text) throw new Error("No code generated");

    const result = JSON.parse(response.text) as CodeResult;
    return result;
  } catch (error) {
    console.error("Firmware Generation Error:", error);
    throw error;
  }
};
