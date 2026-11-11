/**
 * Where the reading list comes from: public feeds from education organisations. `npm run reading-list` fetches them,
 * keeps the newest few items that are about learning, maths or schools, and writes src/blog/reading-list.json.
 * Only the title, link, date and a short excerpt are kept, and every item links to the original.
 */
export interface Source { id: string; name: string; home: string; feed: string; /** keep only items matching this, when the feed covers wider news */ match?: RegExp }

export const SOURCES: Source[] = [
  { id: "dfe", name: "Department for Education", home: "https://www.gov.uk/government/organisations/department-for-education", feed: "https://www.gov.uk/government/organisations/department-for-education.atom", match: /curriculum|maths|mathematics|numeracy|multiplication|times tables|GCSE|A level|phonics|assessment|attendance|primary school/i },
  { id: "eef", name: "Education Endowment Foundation", home: "https://educationendowmentfoundation.org.uk/", feed: "https://educationendowmentfoundation.org.uk/news/rss" },
  { id: "nrich", name: "NRICH, University of Cambridge", home: "https://nrich.maths.org/", feed: "https://nrich.maths.org/rss" },
  { id: "ncetm", name: "NCETM", home: "https://www.ncetm.org.uk/", feed: "https://www.ncetm.org.uk/rss" },
  { id: "schoolsweek", name: "Schools Week", home: "https://schoolsweek.co.uk/", feed: "https://schoolsweek.co.uk/feed/", match: /maths|mathematics|numeracy|curriculum|GCSE|A.level|11.plus|grammar|assessment|exam|SATs|phonics|reading/i },
  { id: "bbc", name: "BBC News: Education", home: "https://www.bbc.co.uk/news/education", feed: "https://feeds.bbci.co.uk/news/education/rss.xml", match: /maths|mathematics|numeracy|curriculum|GCSE|A.level|11.plus|grammar|exam|SATs|primary|pupils|parents|AI|technology/i },
];
