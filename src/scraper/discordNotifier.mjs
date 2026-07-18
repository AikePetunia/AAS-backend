import dotenv from "dotenv";
dotenv.config();

let SELECTED_NOTIFICATOR;

export async function sendDiscordNotification({ type, taskName, status, stats = {} }) {
	switch (type) {
		case "SUCCESFUL_TASK":
			console.log("SUCCESFUL_TASK received, ");
			SELECTED_NOTIFICATOR = process.env.DISCORD_WEBHOOK_SUCCESFUL_TASK;
			break;

		case "ERROR_TASK":
			SELECTED_NOTIFICATOR = process.env.DISCORD_WEBHOOK_ERROR_TASK;
			break;
	}
	if (!type) {
		console.warn("Discord notifier called without a type!");
		return;
	}

	switch (status) {
		case "success":
			console.log("this task succeeded");
			break;
		case "failed":
			console.log("this task failed");
			break;
	}

	let statsText = "";

	if (status === "success") {
		switch (taskName) {
			case "getStorePaths":
				statsText = `Sucess: ${stats.sucessStores}\n Failed: ${stats.failed}`;
				break;

			case "storesDump":
				statsText = `Stores Information: ${stats.storesInfo}`;
				break;

			case "scrapeStores":
				statsText = `All products information: ${stats.storesInfo}`;
				break;

			default:
				statsText = "-";
				break;
		}
	} else {
		statsText = "Task Failed.";
	}

	const embedColor = status === "success" ? 3066993 : 15158332;

	const payload = {
		username: "[AAS] Tasks notifier",
		avatar_url: "https://aas-frontend.vercel.app/assets/eye-D1xYL9FF.gif",
		embeds: [
			{
				title: `Cron Job Finished: ${status.toUpperCase()}`,
				description: "Details:",
				color: embedColor,
				fields: [
					{
						name: "Task Done:",
						value: taskName,
						inline: true,
					},
					{
						name: "Stats",
						value: statsText,
						inline: true,
					},
				],
				timestamp: new Date().toISOString(),
				footer: {
					text: "AAS Task Manager",
				},
			},
		],
	};

	try {
		const response = await fetch(SELECTED_NOTIFICATOR, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
		});

		if (response.ok) {
			console.log("Message sent successfully!");
		} else {
			console.error("Failed to send:", response.statusText);
		}
	} catch (error) {
		console.error("Error sending webhook:", error);
	}
}
