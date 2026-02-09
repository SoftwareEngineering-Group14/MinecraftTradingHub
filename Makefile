f# Default command when you just type 'make'
.DEFAULT_GOAL := help

.PHONY: setup dev build start clean help

setup: ## Install dependencies
	npm install

dev: ## Run the development server
	npm run dev

build: ## Build the production application
	npm run build

start: ## Run the production build locally
	npm run start

clean: ## Remove node_modules and build folders
	rm -rf .next node_modules

help: ## Show this help message
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'