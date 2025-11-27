

import { GoogleGenAI, Type, Schema } from "@google/genai";
import { GeneratedInvoice, InventoryItem, RestockSuggestion } from "../types";
import { SYSTEM_INSTRUCTION_INVENTORY, SYSTEM_INSTRUCTION_INVOICE, SYSTEM_INSTRUCTION_CHAT } from "../constants";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Chat with the shop assistant
 */
export const chatWithAssistant = async (message: string, history: { role: string; parts: { text: string }[] }[]): Promise<string> => {
  try {
    const modelId = "gemini-2.5-flash"; // Fast and capable for chat
    const chat = ai.chats.create({
      model: modelId,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_CHAT,
      },
      history: history.map(h => ({
        role: h.role,
        parts: h.parts
      })),
    });

    const result = await chat.sendMessage({ message });
    return result.text || "I'm sorry, I couldn't generate a response.";
  } catch (error) {
    console.error("Chat Error:", error);
    return "Error connecting to AI Assistant.";
  }
};

/**
 * Generate a structured Invoice JSON based on natural language description
 */
export const generateInvoiceAI = async (details: string): Promise<GeneratedInvoice | null> => {
  try {
    // Schema definition for Invoice
    const invoiceSchema: Schema = {
      type: Type.OBJECT,
      properties: {
        invoice_id: { type: Type.STRING },
        date: { type: Type.STRING },
        customer_name: { type: Type.STRING },
        customer_mobile: { type: Type.STRING },
        sales_person: { type: Type.STRING },
        technician_name: { type: Type.STRING }, // Added Field
        device_type: { type: Type.STRING },
        device_brand: { type: Type.STRING },
        device_model: { type: Type.STRING },
        device_color: { type: Type.STRING },
        device_passcode: { type: Type.STRING },
        device_pattern: { type: Type.STRING },
        received_sim_tray: { type: Type.BOOLEAN },
        received_sim_card: { type: Type.BOOLEAN },
        received_battery: { type: Type.BOOLEAN },
        estimated_cost: { type: Type.NUMBER },
        estimated_completion: { type: Type.STRING },
        line_items: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              description: { type: Type.STRING },
              quantity: { type: Type.NUMBER },
              unit_price: { type: Type.NUMBER },
              amount: { type: Type.NUMBER },
            }
          }
        },
        subtotal: { type: Type.NUMBER },
        tax: { type: Type.NUMBER },
        total: { type: Type.NUMBER },
      },
      required: ["invoice_id", "date", "customer_name", "line_items", "subtotal", "tax", "total"],
    };

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: details,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_INVOICE,
        responseMimeType: "application/json",
        responseSchema: invoiceSchema,
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as GeneratedInvoice;
    }
    return null;

  } catch (error) {
    console.error("Invoice Generation Error:", error);
    return null;
  }
};

/**
 * Analyze Inventory for shortages
 */
export const analyzeInventoryAI = async (inventory: InventoryItem[]): Promise<RestockSuggestion[]> => {
  try {
    const inventoryString = JSON.stringify(inventory.map(item => ({
      id: item.id,
      sku: item.sku,
      name: item.name,
      category: item.category,
      brand: item.brand || 'Generic',
      model: item.model || 'Universal',
      current: item.currentStock,
      threshold: item.reorderPoint
    })));

    const prompt = `Analyze this inventory data: ${inventoryString}. Identify items where 'current' is less than or equal to 'threshold'. Return a JSON list of recommendations. Include brand specific reasoning if applicable.`;

    const suggestionSchema: Schema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
            productId: { type: Type.STRING },
            productName: { type: Type.STRING },
            currentStock: { type: Type.NUMBER },
            reorderPoint: { type: Type.NUMBER },
            recommendedRestock: { type: Type.NUMBER },
            reasoning: { type: Type.STRING },
        },
        required: ["productId", "productName", "currentStock", "reorderPoint", "recommendedRestock", "reasoning"]
      }
    };

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview", // Using Pro for better reasoning on analytics
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_INVENTORY,
        responseMimeType: "application/json",
        responseSchema: suggestionSchema,
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as RestockSuggestion[];
    }
    return [];

  } catch (error) {
    console.error("Inventory Analysis Error:", error);
    return [];
  }
};

/**
 * Generate a concise repair status update message
 */
export const generateStatusUpdate = async (customerName: string, device: string, status: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Write a brief, friendly SMS notification for customer ${customerName}. Their ${device} repair status is now: ${status}. Keep it under 160 chars.`,
        });
        return response.text || "";
    } catch (e) {
        console.error(e);
        return "Your device status has been updated.";
    }
}

/**
 * Generate CRM Outreach Message
 */
export const generateCRMMessage = async (customerName: string, reason: string): Promise<string> => {
  try {
    const prompt = `
      Write a professional, warm, and concise customer service message (email/SMS format) for a repair shop 'Android Mobile Park'.
      
      Customer Name: ${customerName}
      Context/Reason: ${reason}
      
      The tone should be helpful and inviting. Do not include subject lines if it looks like a text message, but include one if it looks like an email.
    `;
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    return response.text || "";
  } catch (e) {
    console.error(e);
    return "Error generating message.";
  }
}