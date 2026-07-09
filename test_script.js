const originalChassisNumber = "ABC";
const newChassisNumber = "DEF";
const pData = { chassisNumbers: ["ABC", "XYZ"] };
const updatedChassisNumbers = (pData.chassisNumbers || []).map((c) => c === originalChassisNumber ? newChassisNumber : c);
console.log(updatedChassisNumbers);
