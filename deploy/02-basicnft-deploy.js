const { network } = require('hardhat');
const { devlopmentChains } = require('../hardhat-helper.config');
const { verify } = require('../utils/verify');

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deployer } = await getNamedAccounts();
  const { deploy, log } = deployments;

  const MarketPlace = await deploy('BasicNFT', {
    from: deployer,
    args: [],
    log: true,
    waitConfirmation: network.config.blockConfirmation || 1,
  });
  log('--------------deployed--------------');

  if (
    !devlopmentChains.includes(network.name) &&
    process.env.ETHERSCAN_API_KEY
  ) {
    console.log('Verifying.........');
    await verify(MarketPlace.address, []);
    console.log('Verified.........');
  }
};

module.exports.tags = ['all', 'basicnft'];
