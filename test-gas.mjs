import { ethers } from "ethers";

async function run() {
  try {
    const provider = new ethers.JsonRpcProvider('https://ethereum-sepolia-rpc.publicnode.com');
    const feeData = await provider.getFeeData();
    console.log("feeData publicnode:", feeData);
  } catch (err) {
    console.error(err);
  }
}
run();
