import { FavouritesScreen } from '@/components/design/FavouritesScreen';
import { useLocalSearchParams } from 'expo-router';

export default function FavouriteVenuesScreen() {
  const { userId } = useLocalSearchParams<{ userId?: string }>();

  return (
    <FavouritesScreen
      config={{
        title: 'Favoriete venues',
        favouriteTable: 'favourite_venues',
        entityTable: 'venues',
        fkColumn: 'venue_id',
        entitySelect: 'id, name, city, image_url',
        mapEntity: (entity) => ({
          id: entity.id,
          name: entity.name,
          subtitle: entity.city ?? null,
          image_url: entity.image_url ?? null,
          isFavourite: true,
        }),
        onPress: (item, router) =>
          router.push({ pathname: '/venue/[id]', params: { id: item.id, name: item.name, city: item.subtitle ?? '' } }),
        filterPlaceholder: 'Filter venues...',
        emptySubtitle: 'Ga naar een venue pagina en voeg ze toe aan je favorieten.',
        userId,
      }}
    />
  );
}
