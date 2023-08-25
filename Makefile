install:
	npm ci

lint:
	npx eslint .

test:
	npm test --colors

test-coverage:
	npm test -- --coverage --coverageProvider=v8
