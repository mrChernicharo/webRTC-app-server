import { configDotenv } from "dotenv";
configDotenv();

const ENVS = {
    dev: {
        CLIENT_URL: "http://localhost:3000",
        PORT: 8000,
    },
    prod: {
        CLIENT_URL: "https://web-rtc-app-client.vercel.app",
        PORT: 8000,
    },
};

export const config = process.env.NODE_ENV in ENVS ? ENVS[process.env.NODE_ENV] : ENVS.dev;
