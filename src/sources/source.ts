import puppeteer from "puppeteer";

export type Source = {
  source: string;
  url: string;
  headerSelector: string;
  linkSelector: string;
  contentSelector: string;
  cleanUrl?: (url: string) => string;
  onEntry?: (page: puppeteer.Page) => void;
};
