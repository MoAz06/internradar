/** Roles the nightly discover check found that were looked at by hand and don't belong on the list
 * (not tech, not early career, outside Europe, or already covered by another posting). They stay out of
 * the report. Add the posting link and a short reason. */
export const skip: { url: string; why: string }[] = [
  { url: "https://job-boards.eu.greenhouse.io/imc/jobs/4945420101", why: "Asks for 2-3 years of work experience after graduating" },
  { url: "https://jobs.ashbyhq.com/doctolib/42b97078-9d79-432d-95d4-0a44fcbb65b9", why: "Medical data labelling; asks for medical training and German, not a tech study" },
  { url: "https://jobs.ashbyhq.com/doctolib/bc312b03-fa9f-4eb0-9e5e-11e14281f584", why: "Laptop and phone stock for the IT team, not a software or data role" },
  { url: "https://jobs.smartrecruiters.com/BoschGroup/744000159058604", why: "Taken off in the check of the roles added on 2026-11-20" },
  { url: "https://jobs.smartrecruiters.com/BoschGroup/744000159338949", why: "Taken off in the check of the roles added on 2026-11-20" },
  { url: "https://abb.wd3.myworkdayjobs.com/External_Career_Page/job/Vaesteras-Vastmanland-County-Sweden/Thesis-Work-on-Post-Fault-Recovery-Stability-of-AI-Data-Center-in-Weak-Grids_JR00049708", why: "Taken off in the check of the roles added on 2026-11-24" },
  { url: "https://abb.wd3.myworkdayjobs.com/External_Career_Page/job/Vaesteras-Vastmanland-County-Sweden/Thesis-Work---AI-Assisted-Design-and-FEM-Based-Development-of-a-Spherical-Electrical-Machine-for-Robotic-Actuation_JR00049503", why: "Taken off in the check of the roles added on 2026-11-24" },
  { url: "https://abb.wd3.myworkdayjobs.com/External_Career_Page/job/Vaesteras-Vastmanland-County-Sweden/Thesis-Work--Current-Source-Inverters-for-High-Performance-Electrical-Drives-in-Robotic-Applications_JR00049513", why: "Taken off in the check of the roles added on 2026-11-24" },
  { url: "https://abb.wd3.myworkdayjobs.com/External_Career_Page/job/Vaesteras-Sweden/Thesis-Work---Investigating-the-environmental-impact-of-AI---Future-Technologies-at-ABB-Robotics_JR00046791-1", why: "Taken off in the check of the roles added on 2026-11-24" },
  { url: "https://abb.wd3.myworkdayjobs.com/External_Career_Page/job/Vaesteras-Vastmanland-County-Sweden/Thesis-Work-on-AI-assisted-Automated-Stability-Assessment-for-Industrial-Grids-with-MATLAB-Simulink-interface_JR00049736-1", why: "Taken off in the check of the roles added on 2026-11-24" },
  { url: "https://hpe.wd5.myworkdayjobs.com/Jobsathpe/job/Winnersh-Berkshire-United-Kingdom/Interns_1216748", why: "Taken off in the check of the roles added on 2026-11-24" },
  { url: "https://jobs.smartrecruiters.com/SopraSteria1/744000163550788", why: "Taken off in the check of the roles added on 2026-11-25" },
  { url: "https://jobs.smartrecruiters.com/SopraSteria1/744000163549169", why: "Taken off in the check of the roles added on 2026-11-25" },
  { url: "https://jobs.smartrecruiters.com/DeliveryHero/744000161452755", why: "Taken off in the check of the roles added on 2026-11-25" },
  { url: "https://jobs.smartrecruiters.com/DeliveryHero/744000161454849", why: "Taken off in the check of the roles added on 2026-11-25" },
];
