const { TEJO_EV_COMPANY } = require("./companyInfo");
const { TEJO_EV_PRODUCTS } = require("./products");
const { TEJO_EV_PRICES } = require("./prices");
const { TEJO_EV_SHOWROOMS } = require("./showrooms");
const { TEJO_EV_SERVICE } = require("./serviceInfo");

function buildTejoEvKnowledge() {
  return {
    company: TEJO_EV_COMPANY,
    products: TEJO_EV_PRODUCTS,
    prices: TEJO_EV_PRICES,
    showrooms: TEJO_EV_SHOWROOMS,
    service: TEJO_EV_SERVICE
  };
}

function buildTejoEvKnowledgePrompt() {
  const knowledge = buildTejoEvKnowledge();

  return `
TEJO EV CUSTOMER KNOWLEDGE

Use this information to answer customer questions.

COMPANY:
${JSON.stringify(knowledge.company)}

PRODUCTS:
${JSON.stringify(knowledge.products)}

PRICES:
${JSON.stringify(knowledge.prices)}

SHOWROOMS:
${JSON.stringify(knowledge.showrooms)}

SERVICE:
${JSON.stringify(knowledge.service)}

RULES:
- Tejo EV sells electric two-wheelers.
- Never invent product specifications.
- Never invent prices, discounts, offers or availability.
- Use the price information provided here for pricing questions.
- Do not claim a vehicle is available in stock unless availability is confirmed.
- For latest availability, booking, offers or information not available here, direct the customer to Tejo EV.
- Official website: https://tejoev.com/
- Sales: 08062178431
- Service: 08069645165
`;
}

module.exports = {
  buildTejoEvKnowledge,
  buildTejoEvKnowledgePrompt
};