import { ArrowLeft } from "lucide-react";
import publication from "../../public/data/publication.json";
import type { Candidate, ImageSample } from "../types";

type Props = {
  candidate?: Candidate;
  title?: string;
  subtitle?: string;
  backLabel?: string;
  samples: ImageSample[];
  onBack: () => void;
};

export function SamplePage({ candidate, title, subtitle, backLabel = "Back to taxonomy", samples, onBack }: Props) {
  const heading = title ?? candidate?.label ?? "Sample image records";
  const description =
    subtitle ??
    (candidate
      ? `${candidate.dataset_id} · ${Number(candidate.image_count).toLocaleString()} images · ${samples.length.toLocaleString()} thumbnails`
      : `${samples.length.toLocaleString()} thumbnails`);
  return (
    <main className="sample-page">
      <button className="ghost-button" onClick={onBack}>
        <ArrowLeft size={16} />
        {backLabel}
      </button>
      <div className="sample-header">
        <p className="eyebrow">Sample image records</p>
        <h1>{heading}</h1>
        <p>{description}</p>
      </div>
      <div className="sample-credits">
        {publication.datasets.filter((dataset) => samples.some((sample) => sample.dataset_id === dataset.dataset_id)).map((dataset) => (
          <p key={dataset.dataset_id}>
            <a href={dataset.source_url} target="_blank" rel="noreferrer">{dataset.name}</a>: {dataset.creators}. {" "}
            <a href={dataset.license_url} target="_blank" rel="noreferrer">{dataset.license}</a>. DOI: {dataset.doi}.
          </p>
        ))}
        <p>{publication.modifications}</p>
      </div>
      <div className="sample-grid">
        {samples.map((sample) => (
          <article className="sample-card" key={`${sample.image_id}-${sample.thumbnail_url}`}>
            <div className="sample-image-frame">
              <img src={sample.thumbnail_url} alt={`${sample.label} sample ${sample.image_id || ""}`} loading="lazy" />
            </div>
            <dl>
              <div><dt>Dataset</dt><dd>{sample.dataset_id}</dd></div>
              <div><dt>Image ID</dt><dd>{sample.image_id || "n/a"}</dd></div>
              <div><dt>Size</dt><dd>{sample.width || "?"} x {sample.height || "?"}</dd></div>
              <div><dt>Source ref</dt><dd className="path-text">{sample.source_ref}</dd></div>
            </dl>
          </article>
        ))}
      </div>
    </main>
  );
}
