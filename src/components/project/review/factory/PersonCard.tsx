import { Person } from "./layout";
import { PersonSprite } from "./parts/Person";
import ProfileCard, { Row, percent } from "./ProfileCard";

// The selected person's profile: where they work, what they are doing, and how their shift went.
export default function PersonCard({
  person,
  following,
  onFollow,
  onClose,
}: {
  person: Person;
  following: boolean;
  onFollow: () => void;
  onClose: () => void;
}) {
  const profile = person.profile;
  return (
    <ProfileCard
      icon={
        <svg viewBox="-12 -41 24 46" className="h-12 w-12" aria-hidden="true">
          <PersonSprite x={0} y={0} vest={person.vest} />
        </svg>
      }
      eyebrow={profile?.area ?? "Worker"}
      title={person.name}
      subtitle={person.role}
      status={profile?.status ?? "Working"}
      detail={profile?.task}
      shift={
        profile && [
          { label: "Working", color: "#2456E6", share: profile.shift.working },
          { label: "Walking", color: "#6E98FF", share: profile.shift.walking },
          { label: "Waiting", color: "#E8871E", share: profile.shift.waiting },
          { label: "Break", color: "#D5DCE8", share: profile.shift.break },
        ]
      }
      following={following}
      onFollow={onFollow}
      onClose={onClose}
    >
      {profile && (
        <>
          <Row label={profile.outputLabel}>
            <b>{profile.output}</b>
          </Row>
          <Row label="Utilisation">
            <b>{percent(profile.utilisation)}</b>
          </Row>
          <Row label="Cost per hour">
            <b>€ {profile.costPerHour}</b> <span className="text-[#5A6782]">({profile.costNote})</span>
          </Row>
        </>
      )}
    </ProfileCard>
  );
}
