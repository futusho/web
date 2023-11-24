-- CreateTable
CREATE TABLE "seller_payouts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "seller_id" UUID NOT NULL,
    "seller_marketplace_id" UUID NOT NULL,
    "seller_marketplace_token_id" UUID NOT NULL,
    "amount" DECIMAL(28,18) NOT NULL,
    "amount_formatted" TEXT NOT NULL,
    "decimals" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "pending_at" TIMESTAMP(3),
    "confirmed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),

    CONSTRAINT "seller_payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seller_payout_transactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "hash" TEXT NOT NULL,
    "seller_payout_id" UUID NOT NULL,
    "network_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmed_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,
    "owner_wallet_address" TEXT NOT NULL DEFAULT '',
    "gas" INTEGER NOT NULL DEFAULT 0,
    "transaction_fee" TEXT NOT NULL DEFAULT '',
    "blockchain_error" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "seller_payout_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "seller_payout_transactions_hash_key" ON "seller_payout_transactions"("hash");

-- CreateIndex
CREATE UNIQUE INDEX "seller_payout_transactions_network_id_hash_key" ON "seller_payout_transactions"("network_id", "hash");

-- AddForeignKey
ALTER TABLE "seller_payouts" ADD CONSTRAINT "seller_payouts_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_payouts" ADD CONSTRAINT "seller_payouts_seller_marketplace_id_fkey" FOREIGN KEY ("seller_marketplace_id") REFERENCES "seller_marketplaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_payouts" ADD CONSTRAINT "seller_payouts_seller_marketplace_token_id_fkey" FOREIGN KEY ("seller_marketplace_token_id") REFERENCES "seller_marketplace_tokens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_payout_transactions" ADD CONSTRAINT "seller_payout_transactions_seller_payout_id_fkey" FOREIGN KEY ("seller_payout_id") REFERENCES "seller_payouts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_payout_transactions" ADD CONSTRAINT "seller_payout_transactions_network_id_fkey" FOREIGN KEY ("network_id") REFERENCES "networks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
