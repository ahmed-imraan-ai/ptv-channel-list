const fs = require("fs");
const path = require("path");

// Paths for the directory and the output file
const listsDirectoryPath = path.join(__dirname, "../lists");
const savePath = path.join(__dirname, "../list.json");

/**
 * Merges all JSON files from a specified directory into a single array.
 * @returns {Promise<Array>} Promise resolving to the merged data array.
 */
async function mergeData() {
  return new Promise((resolve, reject) => {
    let mergedData = [];
    fs.readdir(listsDirectoryPath, (err, files) => {
      if (err) {
        return console.error("Error reading directory:", err);
      }

      files.forEach((file) => {
        try {
          const filePath = path.join(listsDirectoryPath, file);

          // Read and parse each JSON file
          const fileData = JSON.parse(fs.readFileSync(filePath, "utf-8"));

          // Merge the data
          mergedData = mergedData.concat(fileData);
        } catch (parseError) {
          console.error(`Error parsing file ${file}:`, parseError);
        }
      });
      resolve(mergedData);
    });
  });
}

/**
 * Validates the format of each item in the data array.
 * @param {Array} data - The data array to validate.
 * @returns {Object} Contains a flag and details of invalid entries.
 */
function validateItemFormat(data) {
  const videoRequiredKeys = [
    "number",
    "name",
    "code",
    "type",
    "category",
    "playlist",
  ];
  const audioRequiredKeys = ["number", "name", "code", "type", "audio"];
  const invalidItems = [];

  data.forEach((item, index) => {
    const missingKeys = [];
    let currentRequiredKeys = videoRequiredKeys;
    if (item.type == "audio") {
      currentRequiredKeys = audioRequiredKeys;
    }

    const hasAllKeys = currentRequiredKeys.every((key) => {
      const hasKey = item.hasOwnProperty(key) && typeof item[key] === "string";
      if (!hasKey) {
        missingKeys.push(key);
      }
      return hasKey;
    });

    if (!hasAllKeys) {
      invalidItems.push({ channel: item.number, missing: missingKeys });
    }
  });

  return {
    isValid: invalidItems.length === 0,
    invalidItems,
  };
}

/**
 * Checks for duplicate `number` properties in the data array.
 * @param {Array} data - The merged data array.
 * @returns {Object} Contains a flag and details of duplicates.
 */
function checkForDuplicateNumber(data) {
  const existing = new Set();
  const duplicates = [];
  for (const item of data) {
    if (existing.has(item.number)) {
      const duplicateEntry = duplicates.find((d) => d.channel === item.number);

      if (duplicateEntry) {
        duplicateEntry.count += 1;
      } else {
        duplicates.push({ channel: item.number, count: 2 });
      }
    } else {
      existing.add(item.number);
    }
  }
  return {
    hasDuplicate: duplicates.length > 0,
    duplicates,
  };
}
(async () => {
  try {
    const mergedData = await mergeData();

    // Validate the format of the items
    const validation = validateItemFormat(mergedData);
    if (!validation.isValid) {
      console.error("Invalid items found:");
      console.table(validation.invalidItems, ["channel", "missing"]);
      return;
    }

    // Check for duplicates
    const check = checkForDuplicateNumber(mergedData);
    if (check.hasDuplicate) {
      console.error("Duplicates found:");
      console.table(check.duplicates, ["channel", "count"]);
      return;
    }
    const total = mergedData.length;
    const dataString = JSON.stringify(mergedData, null, 2);

    fs.writeFileSync(savePath, dataString, "utf-8");

    console.log(`Success: Total of ${total} entries written to list.json`);
  } catch (error) {
    console.error("An error occurred:", error);
  }
})();
