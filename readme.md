# Advent of Code CLI

Node.js executable package for downloading [Advent of Code](https://adventofcode.com/) 
available challenge descriptions and input data.

### Usage

```shell
npx advent-cli --session <SESSION_COOKIE> .
```


### Options

- `<TARGET_DIR>` *(defaults to `CWD`)*

  Which dir to use for content downloads.

- `--year` *(defaults to current year)*
  
  Set which year to target for download

- `--session <SESSION>`
  
  Set `session` cookie. Required for input data download as everyone receives unique inputs.
  
  `AOC_SESSION` environment variable is also checked as fallback.

  *Note: you can also use `.env` file in target dir or `CWD` to define environment variables.*

- `--no-session`
  
  Use this to load descriptions only without data inputs.


