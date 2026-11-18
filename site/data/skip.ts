/** Roles the nightly discover check found that were looked at by hand and don't belong on the list
 * (not tech, not early career, outside Europe, or already covered by another posting). They stay out of
 * the report. Add the posting link and a short reason. */
export const skip: { url: string; why: string }[] = [
  { url: "https://job-boards.eu.greenhouse.io/imc/jobs/4945420101", why: "Asks for 2-3 years of work experience after graduating" },
];
