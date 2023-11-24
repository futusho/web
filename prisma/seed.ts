import { prisma } from '../src/lib/prisma'

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Unavailable on production')
  }

  await prisma.productCategory.deleteMany()
  await prisma.user.deleteMany()
  await prisma.network.deleteMany()

  console.log('Seeding networks...')

  const binanceTestnet = await prisma.network.create({
    data: {
      title: 'Binance Smart Chain Testnet',
      chainId: 97,
      blockchainExplorerURL: 'https://testnet.bscscan.com',
    },
  })

  console.log('Seeding network marketplaces...')

  const marketplaceOnBinance = await prisma.networkMarketplace.create({
    data: {
      networkId: binanceTestnet.id,
      smartContractAddress: '0x86261aD1d50a509ce62AbC9A1034F0310B125801',
      commissionRate: 3,
    },
  })

  console.log('Seeding network tokens...')

  await prisma.networkMarketplaceToken.create({
    data: {
      marketplaceId: marketplaceOnBinance.id,
      decimals: 18,
      symbol: 'tBNB',
    },
  })

  await prisma.networkMarketplaceToken.create({
    data: {
      marketplaceId: marketplaceOnBinance.id,
      decimals: 18,
      symbol: 'BUSD',
      smartContractAddress: '0xed24fc36d5ee211ea25a80239fb8c4cfd80f12ee',
    },
  })

  console.log('Seeding product categories...')

  await prisma.productCategory.create({
    data: {
      slug: 'ebooks',
      title: 'eBooks',
      description: 'From cutting-edge technology trends to in-depth tutorials',
    },
  })

  await prisma.productCategory.create({
    data: {
      slug: 'website-templates',
      title: 'Website Templates',
      description: 'Premium templates for your website',
    },
  })

  await prisma.productCategory.create({
    data: {
      slug: 'online-courses',
      title: 'Online Courses',
      description: 'Offer digital products on various topics',
    },
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
