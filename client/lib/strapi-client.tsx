import { strapi } from "@strapi/client";
import { getStrapiURL } from "./utils";

const PATH = "/api";
const STRAPI_BASE_URL = getStrapiURL();
const url = new URL(PATH, STRAPI_BASE_URL);

const client = strapi({ baseURL: url.toString() });

export async function getAllArticles() {
  const articles = await client.collection("articles").find();
  return articles;
}

export async function getArticleBySlug(slug: string, status: string) {
  console.log(slug, "slug");
  const article = await client.collection("articles").find({
    filters: {
      slug: { $eq: slug },
    },
    status: status as "draft" | "published" | undefined,
  });
  return article;
}
