# Changelog

All notable changes to this project will be documented in this file.

Copy and paste the following lines and state the changes before merging each commit to MAIN. Latest changes should be shown at the top.
# [Version: ]
# [PR: ] : []
- Enter Change Details Here

-------------------------------------------------------------------------------
# [Version: 1.0.5]
# [PR: 33] : [https://github.com/SoftwareEngineering-Group14/MinecraftTradingHub/pull/33]
- Added /api/v1/store route with GET and POST endpoints for store management
- Removed SQLite dependencies (sqlite, sqlite3, tar) that are incompatible with Vercel serverless deployment
- Added Jest testing framework and related dependencies (@testing-library/jest-dom, @testing-library/react, jest, jest-environment-jsdom)
- Fixed origin variable scope issue in signin and signup API routes to prevent ReferenceError in catch blocks

-------------------------------------------------------------------------------
# [Version: 1.0.4]
# [PR: 23] : [https://github.com/SoftwareEngineering-Group14/MinecraftTradingHub/pull/23]
- Added Sign Up Authentication Page connected to Supabase database
- Added Sign In Authentication Page connected to Supabase database
- Added Makefile to display instructions to test run webb pages in dev
- Implemented Auth policies and permissions

# [Version: 1.0.3]
# [PR: 13] : [https://github.com/SoftwareEngineering-Group14/MinecraftTradingHub/pull/13]
- Ran `npx create-next-app@latest` to init a Next.JS app.
- Added `sqlite` and `sqlite3` dependencies to `package.json`.
- Added basic API implementation (More like psuedocode then actual production code)

# [Version: 1.0.2]
# [PR: 11] : [https://github.com/SoftwareEngineering-Group14/MinecraftTradingHub/pull/11]
- Added Docs folder to save all project documentations and findings.

# [Version: 1.0.1]
# [PR: 2] : [https://github.com/SoftwareEngineering-Group14/MinecraftTradingHub/pull/2]
- Added README.md file to display details about the Repository.
