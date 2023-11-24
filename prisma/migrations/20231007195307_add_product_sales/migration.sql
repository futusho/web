-- CreateTable
CREATE TABLE "product_sales" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "seller_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "seller_marketplace_id" UUID NOT NULL,
    "seller_marketplace_token_id" UUID NOT NULL,
    "product_order_transaction_id" UUID NOT NULL,
    "seller_income" DECIMAL(28,18) NOT NULL,
    "seller_income_formatted" TEXT NOT NULL,
    "platform_income" DECIMAL(28,18) NOT NULL,
    "platform_income_formatted" TEXT NOT NULL,
    "decimals" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_sales_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_sales_product_order_transaction_id_key" ON "product_sales"("product_order_transaction_id");

-- AddForeignKey
ALTER TABLE "product_sales" ADD CONSTRAINT "product_sales_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_sales" ADD CONSTRAINT "product_sales_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_sales" ADD CONSTRAINT "product_sales_seller_marketplace_id_fkey" FOREIGN KEY ("seller_marketplace_id") REFERENCES "seller_marketplaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_sales" ADD CONSTRAINT "product_sales_seller_marketplace_token_id_fkey" FOREIGN KEY ("seller_marketplace_token_id") REFERENCES "seller_marketplace_tokens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_sales" ADD CONSTRAINT "product_sales_product_order_transaction_id_fkey" FOREIGN KEY ("product_order_transaction_id") REFERENCES "product_order_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
