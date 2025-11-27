import { useUser } from "@/hooks/use-user";
import AdminView from "./AdminView";
import TeamLeadView from "./TeamLeadView";
import UserView from "./UserView";

export default function UserDashboard() {
  const { currentUser } = useUser();
  const role = currentUser?.role;

  switch (role) {
    case "admin":
      return <AdminView />;
    case "team-lead":
      return <TeamLeadView />;
    case "user":
      return <UserView />;
    default:
      return <div>Loading...</div>;
  }
}
