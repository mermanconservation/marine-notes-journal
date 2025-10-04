import { ExternalLink } from "lucide-react";

interface AuthorWithOrcidProps {
  authors: string;
  orcidIds?: string[];
}

export const AuthorWithOrcid = ({ authors, orcidIds }: AuthorWithOrcidProps) => {
  if (!orcidIds || orcidIds.length === 0) {
    return <p className="text-lg text-muted-foreground mb-2">{authors}</p>;
  }

  const authorList = authors.split(", ").map(a => a.trim());
  
  return (
    <div className="mb-2">
      <p className="text-lg text-muted-foreground inline">
        {authorList.map((author, index) => (
          <span key={index}>
            {author}
            {orcidIds[index] && (
              <a
                href={`https://orcid.org/${orcidIds[index]}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center ml-1 text-primary hover:text-primary/80"
                title={`ORCID: ${orcidIds[index]}`}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 256 256"
                  className="inline-block"
                  fill="currentColor"
                >
                  <path d="M256,128c0,70.7-57.3,128-128,128C57.3,256,0,198.7,0,128C0,57.3,57.3,0,128,0C198.7,0,256,57.3,256,128z"/>
                  <g>
                    <path fill="#fff" d="M86.3,186.2H70.9V79.1h15.4v48.4V186.2z"/>
                    <path fill="#fff" d="M108.9,79.1h41.6c39.6,0,57,28.3,57,53.6c0,27.5-21.5,53.6-56.8,53.6h-41.8V79.1z M124.3,172.4h24.5c34.9,0,42.9-26.5,42.9-39.7c0-21.5-13.7-39.7-43.7-39.7h-23.7V172.4z"/>
                    <path fill="#fff" d="M88.7,56.8c0,5.5-4.5,10.1-10.1,10.1c-5.6,0-10.1-4.6-10.1-10.1c0-5.6,4.5-10.1,10.1-10.1C84.2,46.7,88.7,51.3,88.7,56.8z"/>
                  </g>
                </svg>
              </a>
            )}
            {index < authorList.length - 1 && ", "}
          </span>
        ))}
      </p>
    </div>
  );
};
