/** Roles the nightly discover check found that were looked at by hand and don't belong on the list
 * (not tech, not early career, outside Europe, or already covered by another posting). They stay out of
 * the report. Add the posting link and a short reason. */
export const skip: { url: string; why: string }[] = [
  { url: "https://job-boards.eu.greenhouse.io/imc/jobs/4945420101", why: "Asks for 2-3 years of work experience after graduating" },
  { url: "https://jobs.ashbyhq.com/doctolib/42b97078-9d79-432d-95d4-0a44fcbb65b9", why: "Medical data labelling; asks for medical training and German, not a tech study" },
  { url: "https://jobs.ashbyhq.com/doctolib/bc312b03-fa9f-4eb0-9e5e-11e14281f584", why: "Laptop and phone stock for the IT team, not a software or data role" },
];
