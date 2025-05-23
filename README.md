# 🚀 Next.js And Strapi 5 Preview Example

https://docs.strapi.io/cms/features/preview

Resources:

- [Strapi Preview docs](https://docs.strapi.io/cms/features/preview)
- [Next.js Draft Mode docs](https://nextjs.org/docs/app/guides/draft-mode)
- [Starter code](https://github.com/PaulBratslavsky/strapi-next-js-preview-starter-code)

## 🚀 Strapi Setup

We will start by enabling the preview feature in the `config/admin.ts` file.

```ts
preview: {
    enabled: true,
    config: {
      allowedOrigins: [env("CLIENT_URL")],
      async handler(uid, { documentId, locale, status }) {
        const document = await strapi.documents(uid).findOne({
          documentId,
          populate: null,
          fields: ["slug"],
        });
        const { slug } = document;

        const urlSearchParams = new URLSearchParams({
          secret: env("PREVIEW_SECRET"),
          ...(slug && { slug }),
          uid,
          status,
        });

        const previewURL = `${env("CLIENT_URL")}/api/preview?${urlSearchParams}`;
        return previewURL;
      },
    },
  },
```

_enabled_: Turns on the preview feature in Strapi.

_config.allowedOrigins_: Specifies which frontend domains can receive preview links. Uses CLIENT_URL from environment variables.

_config.handler(uid, { documentId, locale, status }):_ Async function that:

- Fetches the document by documentId using strapi.documents(uid).findOne(...).
- Extracts the slug from the document.
- Constructs a preview URL with query params including slug, uid, status, and a PREVIEW_SECRET.
- Returns the preview URL to be used by the frontend (e.g. Next.js preview route).

Now that we have our config setup, let's add the following `env` variables to our `.env` file.

```bash
CLIENT_URL=http://localhost:3000
PREVIEW_SECRET=your-secret-key
```

Now, that we have our Strapi backend setup, we can start working on the Next.js frontend.

## 🚀 Next.js Preview Route Setup

In order to receive the preview URL from Strapi, we need to create a preview route in our Next.js app.

```ts
// app/api/preview/route.ts

import { draftMode } from "next/headers";
import { redirect } from "next/navigation";

function getPreviewPath(
  contentType: string | undefined,
  slug: string | null,
  locale: string | null,
  status: string | null
): string {
  const basePath = (() => {
    if (!contentType) return "/";

    if (contentType === "article" || contentType.includes("articles")) {
      return slug ? "/articles/" + slug : "/articles";
    }

    // Can add other content types here

    // if (contentType === 'page' || contentType.includes('pages')) {
    //   return slug ? '/' + slug : '/';
    // }

    return "/" + contentType;
  })();

  const localePath =
    locale && locale !== "en" ? "/" + locale + basePath : basePath;
  const statusParam = status ? "?status=" + status : "";
  return localePath + statusParam;
}

export const GET = async (request: Request) => {
  // Parse query string parameters
  const { searchParams } = new URL(request.url);
  const searchParamsData = Object.fromEntries(searchParams);
  const { secret, slug, locale, uid, status } = searchParamsData;

  console.log(searchParamsData);

  // Check the secret and next parameters
  if (secret !== process.env.PREVIEW_SECRET) {
    return new Response("Invalid token", { status: 401 });
  }

  const contentType = uid?.split(".").pop();
  const finalPath = getPreviewPath(contentType, slug, locale, status);

  // Enable Draft Mode by setting the cookie
  const draft = await draftMode();
  status === "draft" ? draft.enable() : draft.disable();

  // Redirect to the path from the fetched post
  redirect(finalPath);
};
```

_Understanding the route.ts Preview Handler in Next.js_

To enable content previews in a Next.js site powered by a headless CMS like Strapi, you need a backend route that handles preview requests securely.

Below is a breakdown of how the route.ts file works to enable Draft Mode and redirect users to a previewable version of the content.

**Step 1: Parsing Query Parameters**
The handler reads the preview request parameters from the URL:

```ts
const { secret, slug, locale, uid, status } = Object.fromEntries(
  new URL(request.url).searchParams
);
```

These parameters are typically passed from the CMS when a user clicks “Preview” on a content entry.

**Step 2: Validating the Secret Token**
To ensure the request is authorized, the code checks for a secret query param and compares it to an environment variable:

```ts
if (secret !== process.env.PREVIEW_SECRET) {
  return new Response("Invalid token", { status: 401 });
}
```

If the secret doesn't match, the request is rejected.

**Step 3: Determining the Content Type**
The code extracts the content type (e.g. post, page) from the UID:

```ts
const contentType = uid?.split(".").pop();
```

This helps define the preview path later.

**Step 4: Generating the Preview Path**
A helper function, `getPreviewPath`, constructs the preview URL based on:

- Content type (e.g. post or page)
- Slug (e.g. /blog/my-article)
- Locale (e.g. /fr/blog/mon-article)
- Status (e.g. ?status=draft)

Example:

```ts
"/articles/my-article?status=draft";
```

**Step 5: Enabling Draft Mode**
Next.js’s Draft Mode is toggled based on the status value:

```ts
status === "draft" ? draft.enable() : draft.disable();
```

When enabled, it allows the frontend to fetch and display unpublished content.

**Step 6: Redirecting to the Preview URL**
Finally, the user is redirected to the preview URL:

```ts
redirect(finalPath);
```

This takes them to the correct page with Draft Mode enabled if needed.

This preview handler:

- Secures access with a shared secret
- Parses incoming request data
- Enables or disables Next.js Draft Mode
- Redirects users to the correct preview path

Now that we have our preview route setup, we just need to modify our code in the `client/app/articles/[slug]/page.tsx` file to use the Draft Mode.

Let's import the `draftMode` function from the `next/headers` module:

```ts
import { draftMode } from "next/headers";
```

We will use the `draftMode` function to check if the page is in Draft Mode and if it is, we will query the API based on the status.

Let's add the following code to the `client/app/articles/[slug]/page.tsx` file:

```ts
const { isEnabled: isDraftMode } = await draftMode();
const status = isDraftMode ? "draft" : "published";
const { data } = await getArticleBySlug(slug, status)
if (data.length === 0) notFound();
const article = data[0]

return (
  ...
)
```

The completed code will look like this:

```ts
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDate } from "@/lib/utils";
import BlockRenderer from "@/components/block-renderer";
import { ArrowLeft } from "lucide-react";
import { getArticleBySlug } from "@/lib/strapi-client";
import { StrapiImage } from "@/components/custom/strapi-image";
import { draftMode } from "next/headers";

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;

  const { isEnabled: isDraftMode } = await draftMode();
  const status = isDraftMode ? "draft" : "published";
  const { data } = await getArticleBySlug(slug, status);
  if (data.length === 0) notFound();
  const article = data[0];

  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl">
      <Link
        href="/"
        className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to articles
      </Link>

      <article>
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">{article.title}</h1>
          <div className="flex items-center mb-6">
            <div className="relative h-10 w-10 rounded-full overflow-hidden mr-3">
              <StrapiImage
                src={
                  article.author.avatar.url ||
                  "/placeholder.svg?height=50&width=50&query=avatar"
                }
                alt={article.author.name}
                fill
                className="object-cover"
              />
            </div>
            <div>
              <p className="font-medium">{article.author.name}</p>
              <p className="text-sm text-gray-600">
                Published on {formatDate(article.publishedAt)}
              </p>
            </div>
            <span className="mx-3 text-gray-300">|</span>
            <span className="bg-gray-100 rounded-full px-3 py-1 text-sm text-gray-700">
              {article.category.name}
            </span>
          </div>
        </div>

        <div className="relative w-full h-96 mb-8 rounded-lg overflow-hidden">
          <StrapiImage
            src={
              article.cover.url ||
              "/placeholder.svg?height=600&width=1200&query=article cover"
            }
            alt={article.cover.alternativeText || article.title}
            fill
            className="object-cover"
            priority
          />
        </div>

        <div className="prose prose-lg max-w-none">
          {article.blocks.map((block: any, index: number) => (
            <BlockRenderer key={index} block={block} />
          ))}
        </div>
      </article>
    </main>
  );
}
```

We need to update the `getArticleBySlug` function to accept the status parameter.

Let's make the changes to the `getArticleBySlug` function in the `client/lib/strapi-client.ts` file:

```ts
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
```

Finally, let's updata the `env` variables in the `.env` in our next.js project with the following values.

```bash
STRAPI_BASE_URL=http://localhost:1337
PREVIEW_SECRET=your-secret-key
```

**Note:** The `PREVIEW_SECRET` should be the same as the one in our Strapi project.

Now, we can start the Strapi server and the Next.js server and test the preview feature by running the following command in the root of the project.

```bash
npm run dev
```
