import {redirect} from "next/navigation";

// Legacy teacher URL has one canonical workbench, never an independent
// teacher registry or another authorization form.
export default function EnglishTeacherRedirect(){redirect("/workspace")}
