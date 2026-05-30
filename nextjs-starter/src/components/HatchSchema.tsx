export default function HatchSchema({ schema }: { schema: unknown[] }) {
  if (!schema || schema.length === 0) return null;
  return (
    <>
      {schema.map((item, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }} />
      ))}
    </>
  );
}
