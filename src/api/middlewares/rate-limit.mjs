import { rateLimit } from "express-rate-limit";

export const limiter = rateLimit({
	windowMsMs: 20 * 60 * 1000,
	max: 100,
	message: "too much requests, try again later",
});
