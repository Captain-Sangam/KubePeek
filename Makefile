# Thin wrappers over the npm scripts in package.json — that file stays the
# source of truth for how the app is built and run.

.DEFAULT_GOAL := help
.PHONY: help install dev build start typecheck lint export clean

help: ## Show available targets
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  make %-10s %s\n", $$1, $$2}'

install: ## Install dependencies
	npm install

dev: ## Run the app in development mode (Next dev server + Electron window)
	npm run dev

build: ## Build the Next.js production bundle (standalone output)
	npm run build

start: build ## Build and launch the production standalone server (no Electron)
	npm start

typecheck: ## Typecheck the project
	npx tsc --noEmit

lint: ## Lint the project
	npm run lint

export: build ## Package KubePeek.app and install it to Applications (Spotlight-searchable)
	npx electron-builder --dir
	@APP=$$(find dist -maxdepth 2 -name "KubePeek.app" -print -quit); \
	if [ -z "$$APP" ]; then echo "KubePeek.app not found under dist/"; exit 1; fi; \
	if [ -w /Applications ]; then DEST=/Applications; else DEST="$$HOME/Applications"; mkdir -p "$$DEST"; fi; \
	rm -rf "$$DEST/KubePeek.app"; \
	ditto "$$APP" "$$DEST/KubePeek.app"; \
	echo "Installed $$DEST/KubePeek.app — launch it from Spotlight (⌘Space → KubePeek)"

clean: ## Remove build output
	rm -rf .next dist
