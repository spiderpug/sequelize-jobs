REPORTER ?= spec
TESTS = $(shell find ./test/* -name "*.test.js")

# test commands

test:
	@if [ "$$GREP" ]; then \
		make jshint && ./node_modules/mocha/bin/mocha --globals fct,clearImmediate --check-leaks --colors -t 10000 --reporter $(REPORTER) -g "$$GREP" $(TESTS); \
	else \
		make jshint && ./node_modules/mocha/bin/mocha --globals fct,clearImmediate --check-leaks --colors -t 10000 --reporter $(REPORTER) $(TESTS); \
	fi

test-only:
	./node_modules/mocha/bin/mocha --globals setImmediate,clearImmediate --check-leaks --colors -t 10000 --reporter $(REPORTER) $(TESTS); \

jshint:
	./node_modules/.bin/jshint lib

cover:
	rm -rf coverage \
	make jshint && ./node_modules/.bin/istanbul cover ./node_modules/.bin/_mocha -- -t 10000 $(TESTS); \


all: test cover

.PHONY: test