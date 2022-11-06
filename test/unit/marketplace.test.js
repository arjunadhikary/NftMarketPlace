const { assert, expect } = require("chai")
const { ethers, deployments, getNamedAccounts, network } = require("hardhat")
const { devlopmentChains } = require("../../hardhat-helper.config")

!devlopmentChains.includes(network.name)
    ? describe.skip
    : describe("Basic Nft Test", () => {
          let basicNft, marketPlace, accounts
          let deployer, player
          const TOKEN_ID = 0
          const baseAmount = ethers.utils.parseEther("100")

          beforeEach(async function () {
              accounts = await ethers.getSigners()
              deployer = (await getNamedAccounts()).deployer
              player = accounts[1]
              await deployments.fixture(["all"])
              basicNft = await ethers.getContract("BasicNFT")
              marketPlace = await ethers.getContract("MarketPlace")
          })

          describe("it test buying and listing of nfts", () => {
              beforeEach(async function () {
                  await basicNft.mintNFT()
              })
              it("lists and buys nft sucessfully", async function () {
                  await basicNft.approve(marketPlace.address, TOKEN_ID)

                  await marketPlace.listNFT(basicNft.address, TOKEN_ID, baseAmount)
                  const playerConnectedMarketPlace = await marketPlace.connect(player)
                  await playerConnectedMarketPlace.buyNFT(basicNft.address, TOKEN_ID, {
                      value: baseAmount,
                  })
                  const newOwner = await basicNft.ownerOf(TOKEN_ID)
                  assert.equal(newOwner.toString(), player.address)
                  const newBalanceOfDeployer = await marketPlace.getProceeds(deployer)
                  assert.equal(newBalanceOfDeployer.toString(), baseAmount.toString())
              })

              it("fails if nft isnot approved by the deployer", async () => {
                  await expect(
                      marketPlace.listNFT(basicNft.address, TOKEN_ID, baseAmount)
                  ).to.revertedWith("MarketPlace__NotApprovedForTransaction")
              })
              it("fails if nft alreaady listed and emits event", async () => {
                  await basicNft.approve(marketPlace.address, TOKEN_ID)
                  marketPlace.listNFT(basicNft.address, TOKEN_ID, baseAmount)
                  await expect(
                      marketPlace.listNFT(basicNft.address, TOKEN_ID, baseAmount)
                  ).to.revertedWith("MarketPlace__AlreadyListed")
              })
              it("lists the nft and emits an event NFTListedInMarketPlace and checks the getter", async function () {
                  await basicNft.approve(marketPlace.address, TOKEN_ID)
                  await expect(
                      marketPlace.listNFT(basicNft.address, TOKEN_ID, baseAmount)
                  ).to.emit(marketPlace, "NFTListedInMarketPlace")

                  const list = await marketPlace.getLisiting(basicNft.address, TOKEN_ID)
                  assert.equal(list[0].toString(), deployer)
              })
              it("fails due to insufficient amount required to buy", async function () {
                  await basicNft.approve(marketPlace.address, TOKEN_ID)
                  await marketPlace.listNFT(basicNft.address, TOKEN_ID, baseAmount)

                  const playerConnectedMarketPlace = await marketPlace.connect(player)
                  await expect(
                      playerConnectedMarketPlace.buyNFT(basicNft.address, TOKEN_ID, {
                          value: ethers.utils.parseEther("0.005"),
                      })
                  ).to.be.revertedWith("MarketPlace__PriceDoesnotMatch")
              })
              it("fails when user tries to buy nft that isnot listed", async function () {
                  const playerConnectedMarketPlace = await marketPlace.connect(player)
                  await expect(
                      playerConnectedMarketPlace.buyNFT(basicNft.address, TOKEN_ID, {
                          value: ethers.utils.parseEther("0.005"),
                      })
                  ).to.be.revertedWith("MarketPlace__NotListed()")
              })
          })

          describe("Cancel Listing", () => {
              beforeEach(async function () {
                  await basicNft.mintNFT()
                  await basicNft.approve(marketPlace.address, TOKEN_ID)
              })
              it("Cancel's Listing Sucessfully", async function () {
                  await marketPlace.listNFT(basicNft.address, TOKEN_ID, baseAmount)

                  await expect(marketPlace.cancleListing(basicNft.address, TOKEN_ID)).to.emit(
                      marketPlace,
                      "ItemCanceled"
                  )
              })
          })

          describe("Update Listing and checks if price is updated", async () => {
              let newUpdatedPrice
              beforeEach(async function () {
                  await basicNft.mintNFT()
                  await basicNft.approve(marketPlace.address, TOKEN_ID)
                  newUpdatedPrice = ethers.utils.parseEther("0.2")
                  await marketPlace.listNFT(basicNft.address, TOKEN_ID, baseAmount)
              })

              it("Updates the listing", async () => {
                  await marketPlace.updateListing(basicNft.address, TOKEN_ID, newUpdatedPrice)
              })
              const list = await marketPlace.getLisiting(basicNft.address, TOKEN_ID)[0]
              assert.equal(list[1].toString(), newUpdatedPrice.toString())
          })

          describe("Withdraw Proceeds", () => {
              let playerConnectedMarketPlace, balanceofPlayerBeforeBuying
              beforeEach(async () => {
                  await basicNft.mintNFT()
                  await basicNft.approve(marketPlace.address, TOKEN_ID)
                  await marketPlace.listNFT(basicNft.address, TOKEN_ID, baseAmount)
                  playerConnectedMarketPlace = await marketPlace.connect(player)
                  balanceofPlayerBeforeBuying = await accounts[1].getBalance()
              })
              it("withdraws all the proceeds and checks if buyers amount has been deducted", async function () {
                  const trxResponseofBuying = await playerConnectedMarketPlace.buyNFT(
                      basicNft.address,
                      TOKEN_ID,
                      {
                          value: baseAmount,
                      }
                  )
                  const trxReceiptOfBuying = await trxResponseofBuying.wait(1)
                  const balanceofPlayerAfterBuying = await accounts[1].getBalance()

                  assert.equal(
                      balanceofPlayerBeforeBuying,
                      balanceofPlayerAfterBuying
                          .add(baseAmount)
                          .add(trxReceiptOfBuying.gasUsed.mul(trxResponseofBuying.gasPrice))
                          .toString()
                  )

                  const oldBalanceofDeployer = await accounts[0].getBalance()

                  const trxResponse = await marketPlace.withDrawProceeds()
                  const trxReceipt = await trxResponse.wait()

                  const amountLeft = await marketPlace.getProceeds(deployer)
                  assert.equal(amountLeft.toString(), "0")
                  const newBalanceOfDeployer = await accounts[0].getBalance()

                  assert.equal(
                      oldBalanceofDeployer.toString(),
                      newBalanceOfDeployer
                          .sub(baseAmount)
                          .add(trxReceipt.gasUsed.mul(trxReceipt.effectiveGasPrice))
                          .toString()
                  )
              })
              it("fails to withdraw due to insufficent balance", async function () {
                  await expect(marketPlace.withDrawProceeds()).to.revertedWith(
                      "MarketPlace__AmountMustBeAboveZero"
                  )
              })
          })
      })
