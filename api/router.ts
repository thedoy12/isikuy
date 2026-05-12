import { authRouter } from "./auth-router";
import { createRouter, publicQuery } from "./middleware";
import { gameRouter } from "./routers/game";
import { paymentRouter } from "./routers/payment";
import { transactionRouter } from "./routers/transaction";
import { voucherRouter } from "./routers/voucher";
import { bannerRouter } from "./routers/banner";
import { faqRouter } from "./routers/faq";
import { adminRouter } from "./routers/admin";
import { seedRouter } from "./routers/seed";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  game: gameRouter,
  payment: paymentRouter,
  transaction: transactionRouter,
  voucher: voucherRouter,
  banner: bannerRouter,
  faq: faqRouter,
  admin: adminRouter,
  seed: seedRouter,
});

export type AppRouter = typeof appRouter;
