export function selectBasketballPlayer(players) {
  return players?.find((player) => player.strSport === 'Basketball') ?? players?.[0] ?? null;
}

export function normalizePlayer(player) {
  const value = (field) => player?.[field] || 'Não informado';

  return {
    name: value('strPlayer'),
    position: value('strPosition'),
    team: value('strTeam'),
    nationality: value('strNationality'),
    birthDate: value('dateBorn'),
    height: value('strHeight'),
    image: player?.strThumb || '',
  };
}
