import type { Metadata } from "next";
import { getApi } from "@/server/trpc/server";
import { HeroFeatured } from "@/components/catalog/HeroFeatured";
import { ContentRow } from "@/components/catalog/ContentRow";
import { ROUTES } from "@/lib/constants";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "Catalogo",
  description:
    "Lecture, corsi, documentari, masterclass e workshop Ulilearn. Un catalogo curato di fotografia contemporanea.",
};

export const revalidate = 600;

export default async function CatalogHome() {
  const api = await getApi();
  const data = await api.content.publicHome();

  const hasAnyContent =
    data.latest.length > 0 ||
    data.lectures.length > 0 ||
    data.corsi.length > 0 ||
    data.documentari.length > 0 ||
    data.masterclass.length > 0 ||
    data.workshops.length > 0;

  return (
    <div>
      {data.featured && <HeroFeatured content={data.featured} />}

      <div className="mx-auto max-w-7xl space-y-16 px-4 py-16 sm:px-6 lg:px-8">
        {!hasAnyContent ? (
          <EmptyState
            title="Il catalogo è in allestimento"
            description="Presto qui troverai lecture, corsi, documentari, masterclass e workshop."
          />
        ) : (
          <>
            {data.latest.length > 0 && (
              <ContentRow title="Nuovi contenuti" items={data.latest.slice(0, 4)} />
            )}
            <ContentRow
              title="Lecture"
              items={data.lectures}
              seeAllHref={ROUTES.lecture}
            />
            <ContentRow
              title="Corsi"
              items={data.corsi}
              seeAllHref={ROUTES.corsi}
            />
            <ContentRow
              title="Documentari"
              items={data.documentari}
              seeAllHref={ROUTES.documentari}
            />
            <ContentRow
              title="Masterclass in arrivo"
              items={data.masterclass}
              seeAllHref={ROUTES.masterclass}
            />
            <ContentRow
              title="Workshop in presenza"
              items={data.workshops}
              seeAllHref={ROUTES.workshop}
            />
          </>
        )}
      </div>
    </div>
  );
}
