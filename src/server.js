const app = require("./app");
const { port } = require("./config");

app.listen(port, () => {
  console.log(`Cashback Marketplace API running on port ${port}`);
});
