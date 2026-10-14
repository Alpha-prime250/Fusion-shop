import React, { useState, useRef, useCallback } from 'react';
import { TextField, Autocomplete, CircularProgress, Box, Typography, IconButton, Tooltip } from '@mui/material';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import { useNotifier } from '../context/NotificationProvider';

/**
 * GPS-aware shipping address field.
 * - Type-ahead suggestions come from OpenStreetMap's free Nominatim search API
 *   (no Mapbox/Google key required).
 * - The "locate me" button uses the browser's Geolocation API + Nominatim
 *   reverse-geocoding to auto-fill the address from the user's current position.
 * - Selecting a suggestion (or using "locate me") captures lat/lng, which the
 *   parent form sends to the backend for delivery-radius / mapping features.
 */
function AddressAutocomplete({ value, onChange, onCoordinatesChange }) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const debounceRef = useRef(null);
  const { notify } = useNotifier();

  const fetchSuggestions = useCallback(async query => {
    if (!query || query.trim().length < 3) {
      setOptions([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(query)}`, {
        headers: { Accept: 'application/json' },
      });
      const data = await res.json();
      setOptions(
        (data || []).map(item => ({
          label: item.display_name,
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
        }))
      );
    } catch (err) {
      // Non-fatal — user can still type the address manually
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = (_event, newValue) => {
    onChange(newValue);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(newValue), 400);
  };

  const handleSelect = (_event, selected) => {
    if (selected && typeof selected === 'object') {
      onChange(selected.label);
      onCoordinatesChange({ lat: selected.lat, lng: selected.lng });
    }
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      notify({ severity: 'error', message: 'Geolocation is not supported by your browser.' });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async position => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`, {
            headers: { Accept: 'application/json' },
          });
          const data = await res.json();
          const address = data?.display_name || `${latitude}, ${longitude}`;
          onChange(address);
          onCoordinatesChange({ lat: latitude, lng: longitude });
          notify({ severity: 'success', message: 'Location detected and address filled in.' });
        } catch (err) {
          notify({ severity: 'error', message: 'Could not resolve your address from GPS coordinates.' });
        } finally {
          setLocating(false);
        }
      },
      () => {
        notify({ severity: 'error', message: 'Unable to access your location. Please check browser permissions.' });
        setLocating(false);
      }
    );
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
      <Autocomplete
        freeSolo
        fullWidth
        options={options}
        loading={loading}
        filterOptions={x => x}
        inputValue={value || ''}
        onInputChange={handleInputChange}
        onChange={handleSelect}
        getOptionLabel={option => (typeof option === 'string' ? option : option.label)}
        renderOption={(props, option) => (
          <li {...props} key={option.label}>
            <Typography variant="body2">{option.label}</Typography>
          </li>
        )}
        renderInput={params => (
          <TextField
            {...params}
            required
            label="Shipping Address"
            variant="standard"
            helperText="Start typing for suggestions, or use the GPS button to auto-detect."
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading && <CircularProgress color="inherit" size={16} />}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
      />
      <Tooltip title="Use my current location" arrow>
        <span>
          <IconButton color="primary" onClick={handleLocateMe} disabled={locating} sx={{ mt: 1 }}>
            {locating ? <CircularProgress size={20} /> : <MyLocationIcon />}
          </IconButton>
        </span>
      </Tooltip>
    </Box>
  );
}

export default AddressAutocomplete;
