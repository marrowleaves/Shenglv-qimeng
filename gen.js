const fs = require("fs");

const pinyin = require("pinyin");

const RAW_FILE = "raw";
const HTML_TMPL = "index.tmpl.html";
const HTML_OUTPUT = "index.html";
const TMPL_MARK = "__CONTENT__";
const PART_DELIM = "---";
const LINES_PER_SECTION = 4;
const LINE_ENDING = "\n";
const REG_BREAK = /[。；]/;
const MAX_LINE_WIDTH = 16;

//=== helpers

// wrap
const wrap = (tag, inner) => `<${tag}>${inner}</${tag}>`;

const mapAndConcat = (arr, fn) => arr.map(fn).join("");

const addPinyin = (str) =>
  wrap(
    "ruby",
    mapAndConcat(pinyin(str), (py, i) =>
      [str[i], wrap("rp", "("), wrap("rt", py), wrap("rp", ")")].join("")
    )
  );

const withPinyin = (str) => str.replace(/[^，。；]+?(?=[，。；])/g, addPinyin);

const last = (arr) => arr[arr.length - 1];

// break str within max length
const br = (str, maxLen) => {
  const breakIndice = [0];
  let pi = last(breakIndice);
  let tmp = str.search(REG_BREAK);

  while (tmp >= 0) {
    i = pi + tmp + 1;
    const len = i - last(breakIndice);
    if (len > maxLen) {
      if (pi === last(breakIndice)) {
        breakIndice.push(i);
      } else {
        breakIndice.push(pi);
      }
    }
    pi = i;
    tmp = str.substring(pi).search(REG_BREAK);
  }
  breakIndice.push(str.length);

  return breakIndice
    .slice(1, breakIndice.length)
    .map((cur, i) => str.substring(breakIndice[i], cur));
};

const addBrAndPinyin = (str) =>
  br(str, MAX_LINE_WIDTH).map(withPinyin).join("<br>");

//--- helpers end

const data = fs
  .readFileSync(RAW_FILE, { encoding: "utf-8" })
  .trim()
  .split(PART_DELIM)
  .map((part) =>
    part
      .trim()
      .split(LINE_ENDING)
      .reduce((prev, cur, i) => {
        if (i % LINES_PER_SECTION === 0) {
          prev.push({
            title: cur,
            lines: [],
          });
        } else {
          prev[Math.floor(i / LINES_PER_SECTION)].lines.push(cur);
        }
        return prev;
      }, [])
  );

const content = mapAndConcat(data, (part) =>
  wrap(
    "article",
    mapAndConcat(part, (chapter) =>
      wrap(
        "section",
        wrap("h3", chapter.title) +
          mapAndConcat(chapter.lines, (line) => wrap("p", addBrAndPinyin(line)))
      )
    )
  )
);

const template = fs.readFileSync(HTML_TMPL, { encoding: "utf-8" });

const htmlContent = template.replace(TMPL_MARK, wrap("main", content));

fs.writeFileSync(HTML_OUTPUT, htmlContent);

console.log("done");
