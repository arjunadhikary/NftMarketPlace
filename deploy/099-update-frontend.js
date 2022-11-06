const fs = require("fs")
require("dotenv").config()
const { network, ethers } = require("hardhat")
module.exports = async () => {
    if (process.env.UPDATE_FRONTEND.toString() === "true") {
        const FRONTEND_LOCATION = "../nftmarketplace-frontend/constants/networkMapping.json"
        await getDeployedContractAddress(FRONTEND_LOCATION)
    } else {
        console.log("Not updating check env file")
    }
}

const getDeployedContractAddress = async (FRONTEND_LOCATION) => {
    try {
        const addressData = JSON.parse(fs.readFileSync(FRONTEND_LOCATION, "utf-8"))
        const chainId = network.config.chainId.toString()
        const marketPlace = await ethers.getContract("MarketPlace")
        if (chainId in addressData) {
            if (!addressData[chainId]["NftMarketplace"].includes(marketPlace.address)) {
                addressData[chainId]["NftMarketplace"].push(marketPlace.address)
            }
        } else {
            addressData[chainId] = {
                NftMarketPlace: [marketPlace.address],
            }
        }
        fs.writeFileSync(FRONTEND_LOCATION, JSON.stringify(addressData))
    } catch (error) {
        console.log(error)
    }
}

module.exports.tags = ["a", "frontend"]
