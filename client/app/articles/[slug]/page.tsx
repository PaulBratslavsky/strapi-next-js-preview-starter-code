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
