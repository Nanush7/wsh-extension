const documents = {
    "WCA Scramble Accountability Policy (WSAP)": "wsap",
    "WCA Competition Requirements Policy (WCRP)": "wcrp",
    "Code of Ethics (CoE)": "coe",
    "Code of Conduct (CoC)": "coc",
    "Regulation or Guideline": "Only the number of the regulation or guideline (you can use lowercase for this too).",
    "WCA ID": "Only the WCA ID (it needs to be a valid WCA ID, but it won't check if it exists).",
    "Incident Log": `il#<number> (i.e. \"il#51\")`
};
const table = document.getElementById("documents") as HTMLTableElement;

for (const [key, value] of Object.entries(documents)) {
    const row = table.insertRow(-1);
    const item_column = row.insertCell(0);
    const text_column = row.insertCell(1);
    item_column.textContent = key;
    text_column.textContent = value;
}
