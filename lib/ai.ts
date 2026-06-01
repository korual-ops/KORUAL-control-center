export type PromptTemplate = {
  title: string;
  description: string;
  prompt: string;
};

const brandInstruction =
  "You are KORUAL, a Quiet Luxury AI Commerce Operating System. Write in premium commerce language: calm, precise, hotel lifestyle, black marble, gold foil, no trend, only mood.";

export const listingPrompts: PromptTemplate[] = [
  {
    title: "SmartStore title",
    description: "Create a high-conversion Korean marketplace title.",
    prompt: `${brandInstruction}\n\nCreate 10 SmartStore product titles for:\n- Product:\n- Material:\n- Buyer segment:\n- Differentiator:\n\nRules: Korean, no hype, include SEO intent, keep a premium quiet luxury tone.`
  },
  {
    title: "Cafe24 product copy",
    description: "Generate structured product page copy for a branded store.",
    prompt: `${brandInstruction}\n\nWrite Cafe24 product copy with:\n1. Hero headline\n2. Sub copy\n3. Benefit sections\n4. Material and care notes\n5. Purchase reassurance\n\nProduct input:\n- Name:\n- Cost:\n- Target selling price:\n- Supplier memo:`
  },
  {
    title: "Coupang description",
    description: "Translate premium positioning into practical marketplace detail.",
    prompt: `${brandInstruction}\n\nWrite a Coupang product description that balances premium tone with practical purchase clarity.\nInclude bullets for size, texture, use case, package, shipping, and return caution.`
  },
  {
    title: "SEO keywords",
    description: "Generate search terms across lifestyle, use case, and material intent.",
    prompt: `${brandInstruction}\n\nGenerate SEO keyword clusters for the product:\n- Primary commercial keywords\n- Hotel lifestyle keywords\n- Gift keywords\n- Long-tail buyer intent keywords`
  }
];

export const supportPrompts: PromptTemplate[] = [
  {
    title: "Delivery inquiry",
    description: "Calm order-status reply for delayed or pending shipments.",
    prompt: `${brandInstruction}\n\nWrite a customer support response for a delivery inquiry.\nInputs: order status, expected dispatch date, carrier note.\nTone: calm, accountable, premium, concise.`
  },
  {
    title: "Exchange / refund",
    description: "Policy-aware reply that protects margin and customer trust.",
    prompt: `${brandInstruction}\n\nWrite an exchange/refund response.\nInputs: reason, order date, product condition, policy result.\nInclude next action and required photos if needed.`
  },
  {
    title: "Product inquiry",
    description: "Answer material, sizing, care, and use-case questions.",
    prompt: `${brandInstruction}\n\nAnswer a product inquiry with confidence and restraint.\nInputs: customer question, product facts, caution notes.\nEnd with one helpful recommendation.`
  },
  {
    title: "Complaint response",
    description: "De-escalate while preserving the brand voice.",
    prompt: `${brandInstruction}\n\nWrite a complaint response.\nInputs: issue, customer impact, available resolution.\nStructure: acknowledgement, explanation, resolution, next step.`
  }
];
