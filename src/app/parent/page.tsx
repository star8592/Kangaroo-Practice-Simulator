import {redirect} from "next/navigation";
// Old parent records are retained; there is no public family-management step.
export default function ParentLegacyPage(){redirect("/account");}
