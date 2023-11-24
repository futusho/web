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
      title: 'eBooks and Reading Materials',
      description:
        'Explore a collection of digital books, including traditional eBooks, engaging audio books, and interactive eBooks that bring stories and information to life.',
    },
  })

  await prisma.productCategory.create({
    data: {
      slug: 'notion',
      title: 'Notion Templates',
      description:
        'Find ready-to-use templates for various purposes in Notion, from project management to eCommerce. Discover integrations and widgets to enhance your Notion workspace.',
    },
  })

  await prisma.productCategory.create({
    data: {
      slug: 'wordpress',
      title: 'WordPress Products',
      description:
        'Discover a range of WordPress solutions, including visually appealing themes, specialized plugins for added functionalities, and widget packs to customize your website effortlessly.',
    },
  })

  await prisma.productCategory.create({
    data: {
      slug: 'design',
      title: 'Design and Graphics',
      description:
        'Enhance your digital projects with a range of design assets, from icons and UI elements to stock photography, printable art, and graphics for social media.',
    },
  })

  await prisma.productCategory.create({
    data: {
      slug: 'development',
      title: 'Development and Coding',
      description:
        'Access essential tools for development, including code snippets and scripts, mobile app themes, and templates for web development projects.',
    },
  })

  await prisma.productCategory.create({
    data: {
      slug: 'marketing',
      title: 'Digital Marketing',
      description:
        'Improve your marketing efforts with email templates designed to engage, along with tools for marketing automation to simplify campaigns and communication.',
    },
  })

  await prisma.productCategory.create({
    data: {
      slug: 'learning',
      title: 'Learning and Education',
      description:
        'Invest in knowledge with online courses and learning materials covering various topics, from educational eBooks to language learning resources.',
    },
  })

  await prisma.productCategory.create({
    data: {
      slug: 'productivity',
      title: 'Productivity and Organization',
      description:
        'Stay organized and productive with printable planners and organizers, virtual goods for gaming with productivity features, and motivational content for personal growth.',
    },
  })

  await prisma.productCategory.create({
    data: {
      slug: 'vr-and-ar',
      title: 'Virtual and Augmented Reality',
      description:
        'Experience virtual reality content and augmented reality filters to enhance your digital reality.',
    },
  })

  await prisma.productCategory.create({
    data: {
      slug: 'music-and-audio',
      title: 'Music and Audio',
      description:
        'Dive into a world of sound with a collection of digital music and audio files, offering a variety of genres and styles.',
    },
  })

  await prisma.productCategory.create({
    data: {
      slug: 'miscellaneous',
      title: 'Miscellaneous',
      description:
        'Access a variety of content, from data and research reports to subscription services, consulting resources, virtual events and workshops.',
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
