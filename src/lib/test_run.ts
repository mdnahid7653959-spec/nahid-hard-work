import { encryptCredentials, decryptCredentials } from "./crypto";
import { getNestedValue, getArrayValues } from "./jsonPath";

async function testCrypto() {
  console.log("=== Testing Crypto ===");
  const testData = {
    api_key: "test_key_123",
    api_secret: "test_secret_abc",
    tokens: ["token_1", "token_2"]
  };

  const encrypted = encryptCredentials(testData);
  console.log("Encrypted:", encrypted);

  const decrypted = decryptCredentials(encrypted);
  console.log("Decrypted:", decrypted);

  if (JSON.stringify(testData) === JSON.stringify(decrypted)) {
    console.log("SUCCESS: Encryption/Decryption matches perfectly.");
  } else {
    console.error("FAILED: Decrypted data mismatch.");
  }
}

async function testJsonPath() {
  console.log("\n=== Testing JSON Path ===");
  const mockApiResponse = {
    code: 200,
    data: {
      items: [
        {
          id: "item_001",
          name: "Wireless Headset",
          variants: [
            { sku: "WH-001-BLACK", price: 49.99, stock: 150 }
          ],
          images: [
            { url: "https://example.com/headset.jpg" }
          ]
        }
      ]
    }
  };

  const sku = getNestedValue(mockApiResponse, "data.items[0].variants[0].sku");
  const price = getNestedValue(mockApiResponse, "data.items[0].variants[0].price");
  const imgUrl = getNestedValue(mockApiResponse, "data.items[0].images[0].url");

  console.log("Extracted SKU:", sku);
  console.log("Extracted Price:", price);
  console.log("Extracted Image URL:", imgUrl);

  if (sku === "WH-001-BLACK" && price === 49.99 && imgUrl === "https://example.com/headset.jpg") {
    console.log("SUCCESS: JSON Path extraction works perfectly.");
  } else {
    console.error("FAILED: JSON Path extraction failed.");
  }
}

async function runAll() {
  await testCrypto();
  await testJsonPath();
}

runAll().catch(console.error);
