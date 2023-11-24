.DEFAULT_GOAL := help

NPM := npm
NPM_RUN := ${NPM} run
NPX := npx

DOCKER_COMPOSE := docker compose

help: # Show this help
	@egrep -h '\s#\s' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?# "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

setup: # Install dependencies
	@${NPM} install
	@${NPX} husky install

prepare-dev-env:
	@cp .env.development .env

run: prepare-dev-env # Run dev server
	@${NPM_RUN} dev

lint: # Run linters
	@${NPM_RUN} lint:prisma
	@${NPM_RUN} lint

fix: # Run automatically fixes
	@${NPM_RUN} lint-fix
	@${NPX} prettier -w .

db-start: prepare-dev-env # Start dockerized database only
	@${DOCKER_COMPOSE} -f docker-compose.yml up -d dev_db

db-stop: prepare-dev-env # Stop dockerized database only
	@${DOCKER_COMPOSE} -f docker-compose.yml stop dev_db

db-migrate: prepare-dev-env # Apply available migrations
	@${NPM_RUN} db:migrate

db-seed: prepare-dev-env # Seed database
	@${NPX} prisma db seed

#
# Test environment
#

test: # Run test
	@${NPM_RUN} test:db:prepare
	@${NPM_RUN} test

test-db-start: # Up test database
	@${DOCKER_COMPOSE} -f docker-compose.test.yml up test_db

test-db-stop: # Stop dockerized database only
	@${DOCKER_COMPOSE} -f docker-compose.test.yml stop test_db

#
# Production environment
#

prepare-prod-env:
	@cp .env.production .env

prod-docker-build: prepare-prod-env # Build Docker image
	@${DOCKER_COMPOSE} -f docker-compose.production.yml build --build-arg UID=$$(id -u)

prod-docker-start: prepare-prod-env # Run Docker container
	@${DOCKER_COMPOSE} -f docker-compose.production.yml up -d

prod-docker-stop: prepare-prod-env # Stop Docker container
	@${DOCKER_COMPOSE} -f docker-compose.production.yml down

prod-docker-app-cli: prepare-prod-env # Attach to Docker container
	@${DOCKER_COMPOSE} -f docker-compose.production.yml exec app sh

prod-docker-db-migrate: prepare-prod-env # Apply available migrations on Dockerized database
	@${DOCKER_COMPOSE} -f docker-compose.production.yml exec app npm run db:migrate

prod-docker-db-cli: prepare-prod-env # Attach to Docker container
	@${DOCKER_COMPOSE} -f docker-compose.production.yml exec db bash

prod-docker-logs: prepare-prod-env # Show production related logs
	@${DOCKER_COMPOSE} -f docker-compose.production.yml logs -f

#
# OPS
#
ops-nginx-start:
	./ops/nginx.sh
	open http://localhost:8080/

ops-nginx-stop:
	./ops/stop-nginx.sh
