import { Vehicle } from "./layout";
import { ForkliftSprite, PalletJackSprite } from "./parts/Vehicle";
import ProfileCard, { Row, percent } from "./ProfileCard";

const TYPE_NAMES: Record<Vehicle["type"], string> = { forklift: "Forklift", palletJackWithWorker: "Pallet jack" };

// The selected vehicle's profile: who drives it, what it is doing, and how its shift went.
export default function VehicleCard({
  vehicle,
  following,
  onFollow,
  onClose,
}: {
  vehicle: Vehicle;
  following: boolean;
  onFollow: () => void;
  onClose: () => void;
}) {
  const profile = vehicle.profile;
  const forklift = vehicle.type === "forklift";
  return (
    <ProfileCard
      icon={
        <svg viewBox={forklift ? "-32 -62 82 78" : "-42 -52 72 66"} className="h-12 w-12" aria-hidden="true">
          {forklift ? <ForkliftSprite loaded /> : <PalletJackSprite />}
        </svg>
      }
      eyebrow={profile ? `${TYPE_NAMES[vehicle.type]} · ${profile.hall}` : TYPE_NAMES[vehicle.type]}
      title={vehicle.id}
      subtitle={profile && `Driver ${profile.driver} · ${profile.capacity}`}
      status={profile?.status ?? vehicle.task}
      detail={profile?.job}
      shift={
        profile && [
          { label: "Driving", color: "#2456E6", share: profile.shift.driving },
          { label: "Lifting", color: "#6E98FF", share: profile.shift.lifting },
          { label: "Waiting", color: "#E8871E", share: profile.shift.waiting },
          { label: "Idle", color: "#D5DCE8", share: profile.shift.idle },
        ]
      }
      following={following}
      onFollow={onFollow}
      onClose={onClose}
    >
      {profile && (
        <>
          <Row label="Avg. move time">
            <b>{profile.avgMoveMin.toLocaleString("en", { maximumFractionDigits: 1 })} min</b>
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
