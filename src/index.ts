import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.join(__dirname, ".env") });
import puppeteer from "puppeteer";
import { Source } from "./sources/source";
import { sources } from "./sources/sources";
import { db as database } from "va-database";
import { logger } from "./logger";

const getLinks = async (
  page: puppeteer.Page,
  source: Source
): Promise<Array<string>> => {
  await page.waitForXPath(source.linkSelector);

  let handles = await page.$x(source.linkSelector);
  return Promise.all(
    handles.map((handle) => page.evaluate((handle) => handle.href, handle))
  );
};

const getHeader = async (
  page: puppeteer.Page,
  source: Source
): Promise<string> => {
  await page.waitForXPath(source.headerSelector);
  const [headerHandle] = await page.$x(source.headerSelector);
  return page.evaluate((header) => header.textContent, headerHandle);
};

const getContents = async (
  page: puppeteer.Page,
  source: Source
): Promise<Array<string>> => {
  await page.waitForXPath(source.contentSelector);
  let contentHandles = await page.$x(source.contentSelector);
  return Promise.all(
    contentHandles.map((handle) =>
      page.evaluate((handle) => handle.textContent, handle)
    )
  );
};

const crawl = async () => {
  const browser = await puppeteer.launch();
  const vacancies = await Promise.all(
    sources.map(async (source: Source) => {
      const context = await browser.createIncognitoBrowserContext();
      const page = await context.newPage();
      page.setDefaultTimeout(Number(process.env.PUPPETEER_GLOBAL_TIMEOUT!));

      try {
        await page.goto(source.url);
      } catch (err) {
        logger.error("unable to go to the source page: " + source.source);
        logger.error(err);
        return [];
      }

      if (source.onEntry) {
        try {
          source.onEntry(page);
        } catch (err) {
          logger.error("unable execute onEntry function: " + source.source);
          logger.error(err);
          return [];
        }
      }

      let links: Array<string> = [];
      try {
        links = await getLinks(page, source);
      } catch (err) {
        logger.error("unable to get vacancy urls: " + source.source);
        logger.error(err);
        return [];
      }

      if (source.cleanUrl) {
        links = links.map((link) => source.cleanUrl!(link));
      }
      if (links.length === 0) return [];
      try {
        links = await database.vacancies.getUnparsedUrls(links);
      } catch (err) {
        logger.error(
          "failed to get unparsed urls from database: " + source.source
        );
        logger.error(err);
        return [];
      }

      let vacancies: Array<{
        header: string;
        contents: string;
        url: string;
        source: string;
      }> = [];

      for (let link of links) {
        try {
          await page.goto(link);
          const header = await getHeader(page, source);
          const cleanedHeader = cleanHeader(header);
          const contents = await getContents(page, source);
          const cleanedContent = cleanContent(contents);
          vacancies.push({
            header: cleanedHeader,
            contents: cleanedContent,
            url: link,
            source: source.source,
          });
        } catch (err) {
          logger.error("unable to parse: " + link);
          logger.error(err);
        }
      }
      return vacancies;
    })
  );
  try {
    if (vacancies.flat(1).length > 0)
      await database.vacancies.insert(vacancies.flat(1));
  } catch (err) {
    logger.error("failed to insert vacancies to database");
    logger.error(err);
  }
  await browser.close();
};

const cleanHeader = (str: string) => {
  return str
    .replace(/<br\/>|\\n|\\t/gm, " ")
    .replace(/\s\s+/gm, " ")
    .trim();
};

const cleanContent = (strs: Array<string | null>) => {
  return strs
    .join(" ")
    .replace(/[^\wäö.:\-+\/]/gim, " ")
    .replace(/\s\s+/gm, " ")
    .trim();
};

(async function () {
  await crawl();
})();
