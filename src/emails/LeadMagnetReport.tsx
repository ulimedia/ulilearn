import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { LeadAnalysis } from "@/server/integrations/anthropic/schema";

const INK = "#111111";
const PAPER = "#FAF9F7";
const MUTED = "#AAAAAA";
const ACCENT = "#FCF30B";

export function LeadMagnetReport({
  analysis,
  ctaUrl,
}: {
  analysis: LeadAnalysis;
  ctaUrl: string;
}) {
  return (
    <Html lang="it">
      <Head />
      <Preview>{analysis.headline}</Preview>
      <Body
        style={{
          backgroundColor: INK,
          color: PAPER,
          fontFamily: "'Open Sans', Arial, sans-serif",
          margin: 0,
          padding: "32px 0",
        }}
      >
        <Container
          style={{
            maxWidth: 560,
            margin: "0 auto",
            padding: "32px 24px",
            backgroundColor: "#151414",
          }}
        >
          <Text style={{ color: ACCENT, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", margin: 0 }}>
            Ulilearn
          </Text>
          <Heading
            as="h1"
            style={{
              color: PAPER,
              fontFamily: "'Oswald', Arial Narrow, sans-serif",
              fontSize: 32,
              lineHeight: 1.1,
              fontWeight: 300,
              marginTop: 16,
              marginBottom: 8,
            }}
          >
            {analysis.headline}
          </Heading>

          {analysis.caveat && (
            <Text
              style={{
                color: MUTED,
                fontSize: 13,
                fontStyle: "italic",
                borderLeft: `2px solid ${MUTED}`,
                paddingLeft: 12,
                marginTop: 16,
              }}
            >
              {analysis.caveat}
            </Text>
          )}

          <Section style={{ marginTop: 24 }}>
            {analysis.intro.map((para, i) => (
              <Text key={i} style={{ color: PAPER, fontSize: 15, lineHeight: 1.7, margin: "0 0 14px 0" }}>
                {para}
              </Text>
            ))}
          </Section>

          <Hr style={{ borderColor: "rgba(255,255,255,0.08)", margin: "32px 0" }} />

          <AuthorsBlock title="Autori contemporanei" authors={analysis.contemporary} />

          <CtaBlock ctaUrl={ctaUrl} />

          <AuthorsBlock title="Autori storici" authors={analysis.historical} />

          <Hr style={{ borderColor: "rgba(255,255,255,0.08)", margin: "32px 0" }} />

          <Text style={{ color: PAPER, fontSize: 15, lineHeight: 1.7, margin: 0 }}>
            {analysis.closing}
          </Text>

          <CtaBlock ctaUrl={ctaUrl} emphasized />

          <Text style={{ color: MUTED, fontSize: 11, marginTop: 40, lineHeight: 1.6 }}>
            Hai ricevuto questa email perché hai richiesto un&apos;analisi su ulilearn.vercel.app.
            Se non riconosci la richiesta, puoi ignorare questo messaggio.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

function AuthorsBlock({
  title,
  authors,
}: {
  title: string;
  authors: LeadAnalysis["contemporary"];
}) {
  return (
    <Section style={{ marginTop: 24 }}>
      <Text
        style={{
          color: MUTED,
          fontSize: 11,
          letterSpacing: 2,
          textTransform: "uppercase",
          margin: "0 0 12px 0",
        }}
      >
        {title}
      </Text>
      {authors.map((a) => (
        <Section key={a.name} style={{ marginBottom: 18 }}>
          <Text
            style={{
              color: PAPER,
              fontFamily: "'Oswald', Arial Narrow, sans-serif",
              fontSize: 20,
              fontWeight: 300,
              margin: 0,
            }}
          >
            {a.name}
            {a.years && <span style={{ color: MUTED, fontSize: 14, marginLeft: 8 }}>{a.years}</span>}
          </Text>
          <Text style={{ color: PAPER, fontSize: 14, lineHeight: 1.6, marginTop: 6, marginBottom: 0 }}>
            {a.why}
          </Text>
        </Section>
      ))}
    </Section>
  );
}

function CtaBlock({ ctaUrl, emphasized = false }: { ctaUrl: string; emphasized?: boolean }) {
  return (
    <Section
      style={{
        marginTop: emphasized ? 32 : 24,
        marginBottom: emphasized ? 8 : 24,
        padding: emphasized ? "24px 20px" : "16px 20px",
        backgroundColor: emphasized ? ACCENT : "rgba(252,243,11,0.08)",
        textAlign: "center" as const,
      }}
    >
      <Text
        style={{
          color: emphasized ? INK : PAPER,
          fontFamily: "'Oswald', Arial Narrow, sans-serif",
          fontSize: emphasized ? 20 : 15,
          fontWeight: 300,
          margin: "0 0 10px 0",
          lineHeight: 1.2,
        }}
      >
        {emphasized
          ? "Entra nel catalogo Ulilearn Plus"
          : "Approfondisci con Ulilearn Plus"}
      </Text>
      <Link
        href={ctaUrl}
        style={{
          display: "inline-block",
          color: emphasized ? INK : ACCENT,
          fontSize: 13,
          fontWeight: 600,
          textDecoration: "underline",
        }}
      >
        Scopri l&apos;abbonamento →
      </Link>
    </Section>
  );
}

export default LeadMagnetReport;
