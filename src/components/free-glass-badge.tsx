export function FreeGlassBadge({ withBeams = false }: { withBeams?: boolean }) {
  return (
    <div className="free-glass-badge" aria-label="Application 100 pour cent gratuite">
      {withBeams && (
        <>
          <span className="free-glass-halo free-glass-halo-one" aria-hidden="true" />
          <span className="free-glass-halo free-glass-halo-two" aria-hidden="true" />
          <span className="free-glass-beam free-glass-beam-one" aria-hidden="true" />
          <span className="free-glass-beam free-glass-beam-two" aria-hidden="true" />
        </>
      )}
      <div className="free-glass-clip">
        <span className="free-glass-shine" aria-hidden="true" />
        <span className="free-glass-orb" aria-hidden="true" />
        <span className="free-glass-refraction" aria-hidden="true" />
        <strong>100 %</strong>
        <span>gratuit</span>
      </div>
    </div>
  );
}
